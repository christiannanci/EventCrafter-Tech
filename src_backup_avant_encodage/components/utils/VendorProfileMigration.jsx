import { base44 } from "@/api/apiClient";

export async function migrateVendorProfiles() {
  try {
    const allVendors = await base44.entities.VendorProfile.list('-created_date', 1000);
    
    const now = new Date().toISOString();
    const vendorsToUpdate = [];

    for (const vendor of allVendors) {
      const needsUpdate = 
        vendor.free_leads_count === undefined ||
        vendor.last_quota_reset === undefined ||
        vendor.reward_credits === undefined ||
        vendor.verification_status === "unverified";

      if (needsUpdate) {
        vendorsToUpdate.push({
          id: vendor.id,
          data: {
            free_leads_count: vendor.free_leads_count ?? 1, // Golden Lead (1 free lead)
            last_quota_reset: vendor.last_quota_reset ?? now,
            reward_credits: vendor.reward_credits ?? 0,
            verification_status: vendor.verification_status || "pending"
          }
        });
      }
    }

    // Batch update all vendors
    for (const vendor of vendorsToUpdate) {
      await base44.entities.VendorProfile.update(vendor.id, vendor.data);
    }

    console.log(`Migration complete: ${vendorsToUpdate.length} vendors updated`);
    return {
      success: true,
      updated: vendorsToUpdate.length,
      total: allVendors.length
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}