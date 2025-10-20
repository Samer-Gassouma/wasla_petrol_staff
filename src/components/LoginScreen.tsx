"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginScreen() {
  const [cin, setCin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with CIN:', cin);
    setError(null);
    setLoading(true);
    try {
      console.log('Attempting login...');
      await login(cin.trim());
      console.log('Login successful!');
    } catch (e: unknown) {
      console.error('Login failed:', e);
      const error = e as Error;
      setError(error?.message || "Échec de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-gray-50 to-gray-100">
      <Card className="w-full max-w-sm p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xl">
        {/* Branding */}
        <div className="flex flex-col items-center select-none">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {/* Wasla logo */}
            <Image 
              src="/icons/logo.png" 
              alt="Wasla" 
              width={80}
              height={80}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain" 
            />
            {/* Backslash accent */}
            <div className="w-1 h-8 sm:h-10 bg-blue-500 -skew-x-12 opacity-60 rounded-full"></div>
            {/* STE logo */}
            <Image 
              src="/icons/ste.png" 
              alt="STE Dhraiff Services Transport" 
              width={80}
              height={80}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full bg-white p-1" 
            />
          </div>
          <div className="mt-3 sm:mt-4 text-center">
            <div className="text-sm sm:text-base font-semibold">Wasla</div>
            <div className="text-xs text-gray-600">STE Dhraiff Services Transport</div>
            <div className="text-xs text-gray-500 mt-1">Staff Portal</div>
          </div>
        </div>

        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1">
            <Label htmlFor="cin" className="text-sm text-gray-600 font-medium">
              CIN
            </Label>
            <Input
              id="cin"
              value={cin}
              onChange={(e) => setCin(e.target.value)}
              placeholder="Saisissez votre CIN"
              className="w-full"
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          <Button 
            className="w-full" 
            type="submit" 
            disabled={loading}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
        <div className="text-[11px] text-center text-gray-500">
          Accès réservé au personnel autorisé.
        </div>
      </Card>
    </div>
  );
}
