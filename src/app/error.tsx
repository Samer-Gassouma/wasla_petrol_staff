"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorPageProps {
  error?: Error;
  reset?: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-gray-50 to-gray-100">
      <Card className="w-full max-w-md p-6 space-y-6 shadow-xl">
        {/* Branding */}
        <div className="flex flex-col items-center select-none">
          <div className="flex items-center justify-center gap-4">
            <Image 
              src="/icons/logo.png" 
              alt="Wasla" 
              width={64}
              height={64}
              className="w-16 h-16 object-contain" 
            />
            <div className="w-1 h-10 bg-blue-500 -skew-x-12 opacity-60 rounded-full"></div>
            <Image 
              src="/icons/ste.png" 
              alt="STE Dhraiff Services Transport" 
              width={64}
              height={64}
              className="w-16 h-16 object-contain rounded-full bg-white p-1" 
            />
          </div>
          <div className="mt-4 text-center">
            <div className="text-base font-semibold">Wasla Staff</div>
            <div className="text-xs text-gray-600">STE Dhraiff Services Transport</div>
          </div>
        </div>

        {/* Error Content */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Une erreur s&apos;est produite
            </h1>
            <p className="text-sm text-gray-600">
              Désolé, quelque chose s&apos;est mal passé. Veuillez réessayer.
            </p>
            {error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  Détails de l&apos;erreur
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                  {error.message}
                </pre>
              </details>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {reset && (
              <Button onClick={reset} className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4" />
                <span>Réessayer</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="flex items-center space-x-2"
            >
                <span>Retour à l&apos;accueil</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
