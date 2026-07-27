import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({ icon: Icon, label, value, className = "" }) {
  return (
    <Card className={`bg-stone-900 text-white border-0 ${className}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 bg-stone-800 rounded-lg">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-stone-400">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}