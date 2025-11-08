import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface PassengerInfo {
  name: string;
  phone: string;
  age: string;
}

export default function PassengerDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const seats = searchParams.get("seats")?.split(",") || [];
  
  const [passengers, setPassengers] = useState<PassengerInfo[]>(
    seats.map(() => ({ name: "", phone: "", age: "" }))
  );

  const handleInputChange = (index: number, field: keyof PassengerInfo, value: string) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.name || !p.phone || !p.age) {
        toast.error(`Please fill all details for Seat ${seats[i]}`);
        return;
      }
      if (p.phone.length !== 10 || !/^\d+$/.test(p.phone)) {
        toast.error(`Invalid phone number for Seat ${seats[i]}`);
        return;
      }
      if (parseInt(p.age) < 1 || parseInt(p.age) > 120) {
        toast.error(`Invalid age for Seat ${seats[i]}`);
        return;
      }
    }

    // Store passenger details in URL params and proceed to payment
    const params = new URLSearchParams(searchParams);
    params.set("passengers", JSON.stringify(passengers));
    navigate(`/customer/payment?${params}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Passenger Details</span>
          </div>
        </div>
      </header>

      <div className="container py-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {seats.map((seat, index) => (
            <Card key={seat} className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Passenger {index + 1} - Seat {seat}</h3>
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`name-${index}`}>Full Name *</Label>
                  <Input
                    id={`name-${index}`}
                    value={passengers[index].name}
                    onChange={(e) => handleInputChange(index, "name", e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`phone-${index}`}>Phone Number *</Label>
                  <Input
                    id={`phone-${index}`}
                    type="tel"
                    value={passengers[index].phone}
                    onChange={(e) => handleInputChange(index, "phone", e.target.value)}
                    placeholder="10-digit number"
                    maxLength={10}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`age-${index}`}>Age *</Label>
                  <Input
                    id={`age-${index}`}
                    type="number"
                    value={passengers[index].age}
                    onChange={(e) => handleInputChange(index, "age", e.target.value)}
                    placeholder="Age"
                    min="1"
                    max="120"
                    required
                  />
                </div>
              </div>
            </Card>
          ))}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button type="submit" size="lg">
              Proceed to Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}