import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Trash2, Plus, DollarSign, TrendingUp, CheckCircle, Calendar } from "lucide-react";

export default function BudgetTool() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newItem, setNewItem] = useState({ name: "", category: "Venue", estimated_cost: "" });
  const [totalBudget, setTotalBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('FCFA');

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Load user's events
        const allEvents = await base44.entities.Event.list();
        const myEvents = allEvents.filter(e => e.client_id === currentUser.id);
        setEvents(myEvents);
        
        // Select first event by default
        if (myEvents.length > 0) {
          setSelectedEvent(myEvents[0]);
        }
      } catch (e) {
        // Redirect or show login
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    // Load budget items for selected event
    const loadItems = async () => {
      if (!selectedEvent) {
        setItems([]);
        return;
      }
      const data = await base44.entities.BudgetItem.list();
      const eventItems = data.filter(item => item.event_id === selectedEvent.id);
      setItems(eventItems);
      
      // Set currency symbol from event
      const currencyMap = {
        'XAF': 'FCFA',
        'EUR': '€',
        'USD': '$',
        'GBP': '£',
        'NGN': '₦'
      };
      setCurrencySymbol(currencyMap[selectedEvent.currency] || 'FCFA');
    };
    loadItems();
  }, [selectedEvent]);

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.estimated_cost || !selectedEvent) return;
    
    try {
      const created = await base44.entities.BudgetItem.create({
        ...newItem,
        event_id: selectedEvent.id,
        estimated_cost: parseFloat(newItem.estimated_cost),
        actual_cost: 0,
        paid_amount: 0
      });
      setItems([...items, created]);
      setNewItem({ name: "", category: "Venue", estimated_cost: "" });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteItem = async (id) => {
    await base44.entities.BudgetItem.delete(id);
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = async (id, field, value) => {
    const updatedItems = items.map(item => {
      if (item.id === id) return { ...item, [field]: parseFloat(value) || 0 };
      return item;
    });
    setItems(updatedItems);
    
    // Debounce save in real app, here we just save
    const item = items.find(i => i.id === id);
    if (item) {
       await base44.entities.BudgetItem.update(id, { [field]: parseFloat(value) || 0 });
    }
  };

  const totalEstimated = items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
  const totalPaid = items.reduce((sum, item) => sum + (item.paid_amount || 0), 0);

  if (loading) return <div className="p-20 text-center">Loading Budget...</div>;
  if (!user) return <div className="p-20 text-center">Please log in to manage your budget.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Budget Planner</h1>
          {selectedEvent && (
            <p className="text-stone-500 text-sm mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {selectedEvent.title} {selectedEvent.location_city && `- ${selectedEvent.location_city}`}
            </p>
          )}
        </div>
        {events.length > 0 && (
          <Select value={selectedEvent?.id} onValueChange={(id) => setSelectedEvent(events.find(e => e.id === id))}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Sélectionner un événement" />
            </SelectTrigger>
            <SelectContent>
              {events.map(evt => (
                <SelectItem key={evt.id} value={evt.id}>{evt.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!selectedEvent ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-stone-200 mx-auto mb-4" />
            <p className="text-stone-500 mb-4">Veuillez créer ou sélectionner un événement pour gérer votre budget.</p>
            <p className="text-sm text-stone-400">Rendez-vous dans le Gestionnaire d'Invités pour créer votre premier événement.</p>
          </CardContent>
        </Card>
      ) : (
        <>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-stone-500">Estimated Total</p>
                <h3 className="text-2xl font-bold">{totalEstimated.toLocaleString()} {currencySymbol}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-full">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-stone-500">Total Paid</p>
                <h3 className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()} {currencySymbol}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-full">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-stone-500">Remaining Due</p>
                <h3 className="text-2xl font-bold text-rose-600">{(totalEstimated - totalPaid).toLocaleString()} {currencySymbol}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
           <div className="flex items-center gap-4 mb-2">
             <h3 className="font-semibold">Payment Progress</h3>
             <span className="text-sm text-stone-500">{Math.round((totalPaid / (totalEstimated || 1)) * 100)}% Paid</span>
           </div>
           <Progress value={(totalPaid / (totalEstimated || 1)) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Add New Item */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-end bg-stone-50 p-6 rounded-xl border border-stone-200">
        <div className="w-full md:w-1/3 space-y-2">
          <label className="text-sm font-medium">Expense Name</label>
          <Input 
            placeholder="e.g. Wedding Cake" 
            value={newItem.name}
            onChange={e => setNewItem({...newItem, name: e.target.value})}
          />
        </div>
        <div className="w-full md:w-1/4 space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select 
            value={newItem.category}
            onValueChange={val => setNewItem({...newItem, category: val})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Venue", "Catering", "Attire", "Decor", "Music", "Photo/Video", "Transportation", "Other"].map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-1/4 space-y-2">
          <label className="text-sm font-medium">Est. Cost</label>
          <Input 
            type="number" 
            placeholder="0.00" 
            value={newItem.estimated_cost}
            onChange={e => setNewItem({...newItem, estimated_cost: e.target.value})}
          />
        </div>
        <Button className="w-full md:w-auto bg-rose-600 hover:bg-rose-700" onClick={handleAddItem}>
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left p-4 font-medium text-stone-500 text-sm">Item</th>
              <th className="text-left p-4 font-medium text-stone-500 text-sm">Category</th>
              <th className="text-right p-4 font-medium text-stone-500 text-sm">Estimated</th>
              <th className="text-right p-4 font-medium text-stone-500 text-sm">Actual</th>
              <th className="text-right p-4 font-medium text-stone-500 text-sm">Paid</th>
              <th className="text-right p-4 font-medium text-stone-500 text-sm"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.map(item => (
              <tr key={item.id} className="group hover:bg-stone-50/50">
                <td className="p-4 font-medium text-stone-900">{item.name}</td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800">
                    {item.category}
                  </span>
                </td>
                <td className="p-4 text-right text-stone-600">{item.estimated_cost.toLocaleString()} {currencySymbol}</td>
                <td className="p-4 text-right">
                  <Input 
                    type="number" 
                    className="w-24 text-right h-8 ml-auto" 
                    defaultValue={item.actual_cost}
                    onBlur={(e) => updateItem(item.id, 'actual_cost', e.target.value)}
                  />
                </td>
                <td className="p-4 text-right">
                  <Input 
                    type="number" 
                    className="w-24 text-right h-8 ml-auto" 
                    defaultValue={item.paid_amount}
                    onBlur={(e) => updateItem(item.id, 'paid_amount', e.target.value)}
                  />
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="icon" className="text-stone-400 hover:text-red-500" onClick={() => deleteItem(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-stone-500">
                  No expenses added yet. Start by adding your first budget item above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
}