import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/apiClient";
import { CreditCard, Plus, Trash2, Edit2, Smartphone, Landmark, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from '@/components/LanguageContext';

export default function VendorBankAccountManager({ user }) {
    const { toast } = useToast();
    const { t } = useLanguage();
    const [accounts, setAccounts] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [newAccount, setNewAccount] = useState({
        account_label: "",
        account_type: "bank_account",
        bank_name: "",
        account_number: "",
        associated_phone: "",
        notification_email: "",
        priority: "1"
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    useEffect(() => {
        if (user) {
            fetchAccounts();
        }
    }, [user]);

    const fetchAccounts = async () => {
        try {
            const data = await base44.entities.VendorBankAccount.filter({ user_id: user.id });
            // Sort by priority (ascending)
            data.sort((a, b) => (a.priority || 99) - (b.priority || 99));
            setAccounts(data);
        } catch (error) {
            console.error("Failed to fetch accounts", error);
        }
    };

    const handleSave = async () => {
        if (!newAccount.account_label || !newAccount.account_number) {
            toast({ title: t('vendor.genericError'), description: t('bankAccount.requiredFieldsError'), variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...newAccount,
                user_id: user.id,
                priority: parseInt(newAccount.priority) || 1
            };

            if (isEditing && editId) {
                await base44.entities.VendorBankAccount.update(editId, payload);
                toast({ title: t('bankAccount.updatedTitle'), description: t('bankAccount.updatedDesc') });
            } else {
                await base44.entities.VendorBankAccount.create(payload);
                toast({ title: t('bankAccount.addedTitle'), description: t('bankAccount.addedDesc') });
            }
            
            setIsOpen(false);
            resetForm();
            fetchAccounts();
        } catch (error) {
            console.error(error);
            toast({ title: t('vendor.genericError'), description: t('bankAccount.operationFailedError'), variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('bankAccount.confirmDelete'))) return;
        try {
            await base44.entities.VendorBankAccount.delete(id);
            toast({ title: t('bankAccount.deletedTitle'), description: t('bankAccount.deletedDesc') });
            fetchAccounts();
        } catch (error) {
            console.error(error);
        }
    };

    const openEdit = (account) => {
        setNewAccount({
            account_label: account.account_label,
            account_type: account.account_type,
            bank_name: account.bank_name || "",
            account_number: account.account_number,
            associated_phone: account.associated_phone || "",
            notification_email: account.notification_email || "",
            priority: account.priority?.toString() || "1"
        });
        setEditId(account.id);
        setIsEditing(true);
        setIsOpen(true);
    };

    const resetForm = () => {
        setNewAccount({
            account_label: "",
            account_type: "bank_account",
            bank_name: "",
            account_number: "",
            associated_phone: "",
            notification_email: "",
            priority: "1"
        });
        setIsEditing(false);
        setEditId(null);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'mobile_money': return <Smartphone className="w-5 h-5 text-orange-500" />;
            case 'bank_account': return <Landmark className="w-5 h-5 text-blue-500" />;
            default: return <CreditCard className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t('vendorBankAccount.title')}</CardTitle>
                    <CardDescription>{t('vendorBankAccount.subtitle')}</CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if(!val) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-rose-600 hover:bg-rose-700">
                            <Plus className="w-4 h-4 mr-2" /> {t('bankAccount.addAccountButton')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{isEditing ? t('bankAccount.editAccountTitle') : t('bankAccount.addPaymentAccountTitle')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>{t('bankAccount.accountLabelField')}</Label>
                                <Input 
                                    placeholder={t('vendorBankAccount.accountLabelPlaceholder')}
                                    value={newAccount.account_label}
                                    onChange={(e) => setNewAccount({...newAccount, account_label: e.target.value})}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('bankAccount.typeField')}</Label>
                                    <Select 
                                        value={newAccount.account_type}
                                        onValueChange={(val) => setNewAccount({...newAccount, account_type: val})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bank_account">{t('bankAccount.typeBankAccount')}</SelectItem>
                                            <SelectItem value="mobile_money">{t('bankAccount.typeMobileMoney')}</SelectItem>
                                            <SelectItem value="credit_card">{t('bankAccount.typeCreditCard')}</SelectItem>
                                            <SelectItem value="paypal">PayPal</SelectItem>
                                            <SelectItem value="other">{t('bankAccount.typeOther')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('bankAccount.bankNameField')}</Label>
                                    <Input 
                                        placeholder="ex. UBA, MTN" 
                                        value={newAccount.bank_name}
                                        onChange={(e) => setNewAccount({...newAccount, bank_name: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('bankAccount.accountNumberField')}</Label>
                                <Input 
                                    placeholder="ex. 1234567890" 
                                    value={newAccount.account_number}
                                    onChange={(e) => setNewAccount({...newAccount, account_number: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('bankAccount.associatedPhoneField')}</Label>
                                    <Input 
                                        placeholder="+237..." 
                                        value={newAccount.associated_phone}
                                        onChange={(e) => setNewAccount({...newAccount, associated_phone: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('bankAccount.priorityField')}</Label>
                                    <Input 
                                        type="number"
                                        min="1"
                                        value={newAccount.priority}
                                        onChange={(e) => setNewAccount({...newAccount, priority: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('bankAccount.notificationEmailField')}</Label>
                                <Input 
                                    type="email"
                                    placeholder="notify@example.com" 
                                    value={newAccount.notification_email}
                                    onChange={(e) => setNewAccount({...newAccount, notification_email: e.target.value})}
                                />
                            </div>

                            <Button className="w-full bg-rose-600" onClick={handleSave} disabled={loading}>
                                {loading ? t('bankAccount.saving') : t('bankAccount.saveAccountButton')}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {accounts.length > 0 ? (
                    <div className="space-y-4">
                        {accounts.map((account) => (
                            <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-stone-50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-white border rounded-full mt-1">
                                        {getIcon(account.account_type)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-stone-900">{account.account_label}</h4>
                                            {account.priority === 1 && <Badge variant="secondary" className="text-xs">{t('bankAccount.primaryBadge')}</Badge>}
                                        </div>
                                        <p className="text-sm text-stone-500 font-medium">{account.bank_name} • {account.account_number}</p>
                                        <div className="flex gap-4 mt-1 text-xs text-stone-400">
                                            {account.associated_phone && <span>📞 {account.associated_phone}</span>}
                                            {account.notification_email && <span>✉️ {account.notification_email}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-stone-500" onClick={() => openEdit(account)}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(account.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-stone-500">
                        <Wallet className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                        <p>{t('vendorBankAccount.noAccountsYet')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
