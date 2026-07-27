import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, MessageSquare, FileSignature, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function BookingTable({ 
  bookings, 
  loading, 
  page, 
  itemsPerPage,
  onPageChange,
  onDiscussionClick,
  onContractClick,
  StatusBadge,
  RateClientDialog,
  filters = {}
}) {
  // Apply filters and sorting
  let filteredBookings = [...bookings];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredBookings = filteredBookings.filter(b => 
      b.client_name?.toLowerCase().includes(searchLower) ||
      b.notes?.toLowerCase().includes(searchLower)
    );
  }

  // Status filter
  if (filters.status && filters.status !== 'all') {
    filteredBookings = filteredBookings.filter(b => b.status === filters.status);
  }

  // Date sorting
  if (filters.dateSort === 'newest') {
    filteredBookings.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
  } else if (filters.dateSort === 'oldest') {
    filteredBookings.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  }

  // Amount sorting
  if (filters.amountSort === 'highest') {
    filteredBookings.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
  } else if (filters.amountSort === 'lowest') {
    filteredBookings.sort((a, b) => (a.total_amount || 0) - (b.total_amount || 0));
  }

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = filteredBookings.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-stone-100">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6">
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-20 text-center">
          <CalendarCheck className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-900">Aucune réservation</h3>
          <p className="text-stone-500">Lorsque des clients réservent vos services, ils apparaîtront ici.</p>
        </CardContent>
      </Card>
    );
  }

  if (filteredBookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-20 text-center">
          <CalendarCheck className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-900">Aucun résultat</h3>
          <p className="text-stone-500">Aucune réservation ne correspond à vos filtres.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-stone-100">
          {paginatedBookings.map(booking => (
            <div key={booking.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-50 rounded-full text-rose-600">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900">{booking.client_name || 'Client'}</h4>
                  <p className="text-stone-500 text-sm">
                    Demandé pour <span className="font-medium text-stone-900">
                      {format(new Date(booking.event_date), 'dd/MM/yyyy')}
                    </span>
                  </p>
                  {booking.total_amount > 0 && (
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="font-medium text-green-600">
                        +{booking.total_amount?.toLocaleString()} FCFA
                      </span>
                      <span className="text-stone-400">|</span>
                      <span className="text-rose-500">
                        Frais: {booking.commission_amount?.toLocaleString()} FCFA
                      </span>
                    </div>
                  )}
                  {booking.notes && (
                    <p className="text-stone-400 text-xs mt-2 bg-stone-50 p-2 rounded">
                      "{booking.notes}"
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <StatusBadge status={booking.status} />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onDiscussionClick(booking)}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Discussion
                  </Button>

                  {booking.status !== 'draft' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={() => onContractClick(booking)}
                    >
                      <FileSignature className="w-4 h-4 mr-2" />
                      Gérer Contrat
                    </Button>
                  )}

                  {(booking.status === 'completed' || booking.status === 'cancelled') && (
                    <RateClientDialog booking={booking} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-stone-600">
              Page {page} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}