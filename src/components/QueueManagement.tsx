"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listQueue,
  listQueueSummaries,
  reorderQueue,
  deleteQueueEntry,
  addVehicleToQueue,
  searchVehicles,
  listVehicles,
  getVehicleAuthorizedRoutes
} from "@/lib/api";
import { API } from "@/config/api";
import { connectQueue } from "@/lib/websocket";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Car,
  Users,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Summary = { 
  destinationId: string; 
  destinationName: string; 
  totalVehicles: number; 
  totalSeats: number; 
  availableSeats: number; 
  basePrice: number 
};

type QueueEntry = { 
  id: string; 
  vehicleId: string; 
  licensePlate: string;
  vehicleType: string;
  totalSeats: number;
  availableSeats: number;
  queuePosition: number;
  status: string;
  hasDayPass: boolean;
  dayPassStatus: string;
  dayPassPurchasedAt?: string;
  hasTripsToday: boolean;
  createdAt: string;
  updatedAt: string;
};

function SortableQueueItem({ 
  entry, 
  onMoveUp, 
  onMoveDown, 
  onDelete 
}: { 
  entry: QueueEntry; 
  onMoveUp: () => void; 
  onMoveDown: () => void; 
  onDelete: () => void; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 font-bold text-sm sm:text-base">{entry.queuePosition}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{entry.licensePlate}</div>
            <div className="text-xs sm:text-sm text-gray-500 truncate">{entry.vehicleType}</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">{entry.availableSeats}/{entry.totalSeats}</span>
            <span className="sm:hidden">{entry.availableSeats}</span>
          </div>
          {entry.hasDayPass && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 hidden sm:inline-flex">
              Day Pass
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={onMoveUp}
            className="h-6 w-6 sm:h-8 sm:w-8 p-0"
          >
            <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onMoveDown}
            className="h-6 w-6 sm:h-8 sm:w-8 p-0"
          >
            <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function QueueManagement() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [selected, setSelected] = useState<Summary | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<unknown[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Record<string, unknown> | null>(null);
  const [vehicleAuthorizedStations, setVehicleAuthorizedStations] = useState<unknown[]>([]);
  const [showStationSelection, setShowStationSelection] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsLatency, setWsLatency] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [vehicleQueueStatus, setVehicleQueueStatus] = useState<Record<string, { stationName: string; position: number }>>({});
  const wsClientRef = useRef<ReturnType<typeof connectQueue> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const summariesResponse = await listQueueSummaries();
      setSummaries(summariesResponse.data as Summary[]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkVehicleQueueStatus = async (vehicles: unknown[]) => {
    const statusMap: Record<string, { stationName: string; position: number }> = {};
    
    // Only check if we have summaries loaded
    if (summaries.length === 0) {
      return;
    }
    
    for (const summary of summaries) {
      try {
        const queueResponse = await listQueue(summary.destinationId);
        const queueItems = queueResponse.data as QueueEntry[];
        
        queueItems.forEach((item: QueueEntry) => {
          const vehicle = vehicles.find(v => (v as Record<string, unknown>).id === item.vehicleId);
          if (vehicle) {
            statusMap[item.vehicleId] = {
              stationName: summary.destinationName,
              position: item.queuePosition
            };
          }
        });
      } catch (error) {
        console.error(`Error checking queue for ${summary.destinationName}:`, error);
      }
    }
    
    setVehicleQueueStatus(statusMap);
  };

  const loadQueue = useCallback(async (destinationId: string) => {
    try {
      setLoading(true);
      const response = await listQueue(destinationId);
      const items = response.data.map((e: unknown) => {
        const item = e as Record<string, unknown>;
        return {
          ...item,
          availableSeats: Number(item.availableSeats ?? 0),
          totalSeats: Number(item.totalSeats ?? 0),
          queuePosition: Number(item.queuePosition ?? 0),
          status: item.status,
          hasDayPass: item.hasDayPass ?? false,
          dayPassStatus: item.dayPassStatus ?? 'no_pass',
          dayPassPurchasedAt: item.dayPassPurchasedAt,
          hasTripsToday: item.hasTripsToday ?? false,
        } as QueueEntry;
      });
      setQueue(items);

      // Create WebSocket connection
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }

          const wsCtrl = connectQueue(destinationId, {
            onOpen: () => {
              console.log('WebSocket connected');
              setWsConnected(true);
              setLastUpdate(new Date());
            },
            onClose: () => {
              console.log('WebSocket disconnected');
              setWsConnected(false);
            },
            onError: (error) => {
              console.error('WebSocket error:', error);
              setWsConnected(false);
            },
            onConnectionStatus: (connected, latency) => {
              setWsConnected(connected);
              setWsLatency(latency);
            },
            onMessage: (ev) => {
              try {
                const msg = JSON.parse(ev.data);
                console.log('WebSocket message received:', msg.type);
                setLastUpdate(new Date());

                if (msg.type && (msg.type.includes("queue_") || msg.type.includes("queue_entry"))) {
                  if (msg.data?.queue) {
                    const items = (msg.data.queue as unknown[]).map((e: unknown) => {
                      const item = e as Record<string, unknown>;
                      return {
                        ...item,
                        availableSeats: Number(item.availableSeats ?? 0),
                        totalSeats: Number(item.totalSeats ?? 0),
                        queuePosition: Number(item.queuePosition ?? 0),
                        status: item.status,
                        hasDayPass: item.hasDayPass ?? false,
                        dayPassStatus: item.dayPassStatus ?? 'no_pass',
                        dayPassPurchasedAt: item.dayPassPurchasedAt,
                        hasTripsToday: item.hasTripsToday ?? false,
                      } as QueueEntry;
                    });
                    // Only update if we're not currently reordering to avoid conflicts
                    if (!reordering) {
                      setQueue(items);
                    }
                  } else if (msg.type === "queue_reordered" && !reordering) {
                    // Handle queue reordered events from other clients
                    listQueue(destinationId).then(response => {
                      const items = response.data.map((e: unknown) => {
                        const item = e as Record<string, unknown>;
                        return {
                          ...item,
                          availableSeats: Number(item.availableSeats ?? 0),
                          totalSeats: Number(item.totalSeats ?? 0),
                          queuePosition: Number(item.queuePosition ?? 0),
                          status: item.status,
                          hasDayPass: item.hasDayPass ?? false,
                          dayPassStatus: item.dayPassStatus ?? 'no_pass',
                          dayPassPurchasedAt: item.dayPassPurchasedAt,
                          hasTripsToday: item.hasTripsToday ?? false,
                        } as QueueEntry;
                      });
                      setQueue(items);
                    });
                  } else if (msg.type === "queue_entry_added" || msg.type === "queue_entry_removed") {
                    // Refresh queue summaries when entries are added/removed
                    loadInitialData();
                    // Also refresh current queue if it's the same station
                    if (selected && msg.data?.entry?.destinationId === selected.destinationId) {
                      loadQueue(selected.destinationId);
                    }
                  }
                }
              } catch (error) {
                console.error('Error processing WebSocket message:', error);
              }
            }
          });

      wsClientRef.current = wsCtrl;
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
    }
  }, [reordering]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load queue when destination is selected
  useEffect(() => {
    if (selected) {
      loadQueue(selected.destinationId);
    }
  }, [selected, loadQueue]);

  // WebSocket connection for summaries updates (use first station if available)
  useEffect(() => {
    const stationId = summaries.length > 0 ? summaries[0].destinationId : "default";
    const globalWsClient = connectQueue(stationId, {
      onOpen: () => {
        console.log('Global WebSocket connected');
        setWsConnected(true);
      },
      onClose: () => {
        console.log('Global WebSocket disconnected');
        setWsConnected(false);
      },
      onError: (error) => {
        console.error('Global WebSocket error:', error);
        console.error('WebSocket URL:', `${API.ws}/ws/queue/${stationId}`);
        setWsConnected(false);
      },
      onConnectionStatus: (connected, latency) => {
        setWsConnected(connected);
        setWsLatency(latency);
      },
      onMessage: (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          console.log('Global WebSocket message:', msg.type);
          setLastUpdate(new Date());

          // Refresh summaries when any queue changes
          if (msg.type && (msg.type.includes("queue_entry_added") || msg.type.includes("queue_entry_removed") || msg.type.includes("queue_reordered"))) {
            loadInitialData();
            // Update vehicle queue status for search results
            if (searchResults.length > 0) {
              checkVehicleQueueStatus(searchResults);
            }
          }
        } catch (error) {
          console.error('Error processing global WebSocket message:', error);
        }
      }
    });

    return () => {
      globalWsClient.disconnect();
    };
  }, [summaries]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && selected) {
      const oldIndex = queue.findIndex(item => item.id === active.id);
      const newIndex = queue.findIndex(item => item.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        await reorderQueueItems(oldIndex, newIndex);
      }
    }
  };

  const handleMoveUp = async (entry: QueueEntry) => {
    if (!selected) return;
    
    const currentIndex = queue.findIndex(item => item.id === entry.id);
    if (currentIndex > 0) {
      await reorderQueueItems(currentIndex, currentIndex - 1);
    }
  };

  const handleMoveDown = async (entry: QueueEntry) => {
    if (!selected) return;
    
    const currentIndex = queue.findIndex(item => item.id === entry.id);
    if (currentIndex < queue.length - 1) {
      await reorderQueueItems(currentIndex, currentIndex + 1);
    }
  };

  const reorderQueueItems = async (oldIndex: number, newIndex: number) => {
    // Immediately update the UI with new positions
    const newQueue = arrayMove(queue, oldIndex, newIndex);
    // Update queue positions to reflect new order
    const updatedQueue = newQueue.map((item, index) => ({
      ...item,
      queuePosition: index + 1
    }));
    setQueue(updatedQueue);
    setReordering(true);

    try {
      // Send the new order to the backend
      const entryIds = updatedQueue.map(item => item.id);
      console.log('Reordering queue with entryIds:', entryIds);
      await reorderQueue(selected!.destinationId, entryIds);
      console.log('Queue reordered successfully');
    } catch (error) {
      console.error('Failed to reorder queue:', error);
      // Revert the UI change on error
      await loadQueue(selected!.destinationId);
    } finally {
      setReordering(false);
    }
  };

  const handleDelete = async (entry: QueueEntry) => {
    if (!selected) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${entry.licensePlate} de la file d'attente ?`)) {
      try {
        await deleteQueueEntry(selected.destinationId, entry.id);
        
        // Refresh queue and summaries to get updated data
        setLoading(true);
        try {
          // Refresh queue data
          const response = await listQueue(selected.destinationId);
          const items = response.data.map((e: unknown) => {
            const item = e as Record<string, unknown>;
            return {
              ...item,
              availableSeats: Number(item.availableSeats ?? 0),
              totalSeats: Number(item.totalSeats ?? 0),
              queuePosition: Number(item.queuePosition ?? 0),
              status: item.status,
              hasDayPass: item.hasDayPass ?? false,
              dayPassStatus: item.dayPassStatus ?? 'no_pass',
              dayPassPurchasedAt: item.dayPassPurchasedAt,
              hasTripsToday: item.hasTripsToday ?? false,
            } as QueueEntry;
          });
          setQueue(items);
          
          // Refresh queue summaries to update seat counts
          const summariesResponse = await listQueueSummaries();
          setSummaries(summariesResponse.data as Summary[]);
        } catch (refreshError) {
          console.error('Failed to refresh queue:', refreshError);
          // Fallback: just remove the vehicle from local state
          setQueue(queue.filter(item => item.id !== entry.id));
        } finally {
          setLoading(false);
        }
        
        console.log('Successfully removed from queue:', entry.id);
      } catch (error) {
        console.error('Échec du retrait de la file :', error);
        alert('Échec du retrait du Vehicule de la file. Veuillez réessayer.');
      }
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      try {
        // Enhanced search focusing on the right part of license plate
        const response = await searchVehicles(query);
        setSearchResults(response.data);
        // Check if any of the found vehicles are already in queues
        await checkVehicleQueueStatus(response.data);
      } catch (error) {
        console.error('Error searching vehicles:', error);
        // Fallback: try to get all vehicles and filter locally with improved logic
        try {
          const allVehiclesResponse = await listVehicles();
          const allVehicles = allVehiclesResponse.data as Record<string, unknown>[];
          const filteredVehicles = allVehicles.filter(vehicle => {
            const licensePlate = (vehicle.licensePlate as string)?.toLowerCase() || '';
            const searchTerm = query.toLowerCase().trim();
            
            // Focus on the right part of license plate (after "TUN")
            const tunIndex = licensePlate.indexOf('tun');
            if (tunIndex !== -1) {
              const rightPart = licensePlate.substring(tunIndex + 3).replace(/\s/g, '');
              return rightPart.includes(searchTerm.replace(/\s/g, ''));
            }
            
            // Fallback to full license plate search
            return licensePlate.includes(searchTerm);
          });
          setSearchResults(filteredVehicles);
          // Check if any of the filtered vehicles are already in queues
          await checkVehicleQueueStatus(filteredVehicles);
        } catch (fallbackError) {
          console.error('Fallback search also failed:', fallbackError);
          setSearchResults([]);
        }
      }
    } else {
      setSearchResults([]);
      setVehicleQueueStatus({});
    }
  };

  const handleVehicleSelect = async (vehicle: Record<string, unknown>) => {
    setSelectedVehicle(vehicle);
    try {
      const response = await getVehicleAuthorizedRoutes(vehicle.id as string);
      setVehicleAuthorizedStations(response.data);
      setShowStationSelection(true);
    } catch (error) {
      console.error('Error fetching authorized stations:', error);
      alert('Erreur lors de la récupération des stations autorisées pour ce Vehicule.');
    }
  };

  const handleAddVehicleToStation = async (stationId: string, stationName: string) => {
    if (!selectedVehicle) return;
    
    try {
      await addVehicleToQueue(stationId, selectedVehicle.id as string, stationName);
      
      // The WebSocket will handle the real-time updates, but we can also manually refresh
      // Refresh summaries to update vehicle counts
      await loadInitialData();
      
      // Refresh the queue if it's the currently selected station
      if (selected && selected.destinationId === stationId) {
        await loadQueue(stationId);
      }
      
      // Update vehicle queue status for any open search results
      if (searchResults.length > 0) {
        await checkVehicleQueueStatus(searchResults);
      }
      
      setShowAddDialog(false);
      setShowStationSelection(false);
      setSelectedVehicle(null);
      setVehicleAuthorizedStations([]);
      setSearchQuery("");
      setSearchResults([]);
      
      alert(`Vehicule ${selectedVehicle.licensePlate} ajouté avec succès à la file d'attente de ${stationName}`);
    } catch (error) {
      console.error('Error adding vehicle to station:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'ajout du Vehicule';
      
      // Handle specific backend errors
      if (errorMessage.includes('already in queue')) {
        alert(`❌ ${errorMessage}. Veuillez d'abord retirer le Vehicule de sa file actuelle.`);
      } else {
        alert(`❌ ${errorMessage}. Veuillez réessayer.`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestion des Files d&apos;Attente</h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-1">Gérez les files d&apos;attente des stations</p>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Real-time Status Indicator */}
                  <div className="flex items-center space-x-2 text-xs sm:text-sm">
                    {wsConnected ? (
                      <div className="flex items-center space-x-1 text-green-600">
                        <Wifi className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Connecté</span>
                        {wsLatency > 0 && (
                          <span className="text-gray-500">({wsLatency}ms)</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-red-600">
                        <WifiOff className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Déconnecté</span>
                      </div>
                    )}
                    {lastUpdate && (
                      <div className="text-gray-500">
                        <span className="hidden sm:inline">Dernière MAJ: </span>
                        {lastUpdate.toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Ajouter Vehicule</span>
                  <span className="sm:hidden">Ajouter</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Ajouter un Vehicule</DialogTitle>
                  <p className="text-sm text-gray-600">Recherchez un Vehicule et sélectionnez sa station autorisée</p>
                </DialogHeader>
                
                {!showStationSelection ? (
                  <div className="space-y-4">
                    <div>
                      <Input
                        placeholder="Rechercher par numéro de plaque (ex: 1111, 4567)..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full"
                      />
                      {searchQuery.length > 0 && searchQuery.length < 2 && (
                        <p className="text-xs text-gray-500 mt-1">Tapez au moins 2 caractères pour rechercher par numéro de plaque</p>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {searchResults.length > 0 ? (
                        searchResults.map((vehicle: unknown) => {
                          const v = vehicle as Record<string, unknown>;
                          const queueStatus = vehicleQueueStatus[v.id as string];
                          return (
                          <div
                            key={v.id as string}
                            className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                              queueStatus ? 'border-orange-200 bg-orange-50' : ''
                            }`}
                            onClick={() => !queueStatus && handleVehicleSelect(v)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                queueStatus ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {queueStatus ? queueStatus.position : '#'}
                              </div>
                              <div>
                                <div className="font-medium">{v.licensePlate as string}</div>
                                <div className="text-sm text-gray-600">{v.vehicleType as string}</div>
                                {queueStatus && (
                                  <div className="text-xs text-orange-600 font-medium mt-1">
                                    ⚠️ Déjà en file d&apos;attente à {queueStatus.stationName} (Position {queueStatus.position})
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!queueStatus) {
                                  handleVehicleSelect(v);
                                }
                              }}
                              disabled={!!queueStatus}
                            >
                              {queueStatus ? 'En file' : 'Sélectionner'}
                            </Button>
                          </div>
                          );
                        })
                      ) : searchQuery.length > 2 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Car className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>Aucun Vehicule trouvé</p>
                          <p className="text-sm">Essayez avec d&apos;autres termes de recherche</p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Car className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>Commencez à taper pour rechercher un Vehicule</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Car className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{selectedVehicle?.licensePlate as string}</div>
                        <div className="text-sm text-gray-600">{selectedVehicle?.vehicleType as string}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Stations autorisées</h3>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {vehicleAuthorizedStations.length > 0 ? (
                          vehicleAuthorizedStations.map((station: unknown) => {
                            const s = station as Record<string, unknown>;
                            return (
                            <div
                              key={s.stationId as string}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div>
                                <div className="font-medium">{s.stationName as string}</div>
                                <div className="text-sm text-gray-600">
                                  Priorité: {s.priority as number}
                                  {(s.isDefault as boolean) && <span className="ml-2 text-blue-600">(Par défaut)</span>}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleAddVehicleToStation(s.stationId as string, s.stationName as string)}
                              >
                                Ajouter
                              </Button>
                            </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <p>Aucune station autorisée pour ce Vehicule</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowStationSelection(false);
                          setSelectedVehicle(null);
                          setVehicleAuthorizedStations([]);
                        }}
                      >
                        Retour
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Station Selection */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Sélectionner une Station</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {summaries.map((summary: Summary) => (
              <Card
                key={`${summary.destinationId}-${summary.destinationName}`}
                className={`p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
                  selected?.destinationId === summary.destinationId
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelected(summary)}
              >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 truncate">{summary.destinationName}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {summary.totalVehicles} Vehicules
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          ID: {summary.destinationId}
                        </p>
                      </div>
                  <div className="text-right ml-2">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                      {summary.availableSeats}/{summary.totalSeats}
                    </div>
                    <div className="text-xs text-gray-500">places</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

            {/* Queue Management */}
            {selected && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                          File d&apos;attente - {selected.destinationName}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {queue.length} Vehicules en attente
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Real-time indicator for this station */}
                        {wsConnected && selected.destinationId && (
                          <div className="flex items-center space-x-1 text-green-600 text-xs">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="hidden sm:inline">Temps réel</span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadQueue(selected.destinationId)}
                          disabled={loading}
                          className="flex items-center space-x-1"
                        >
                          <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">Actualiser</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="relative">
                {/* Real-time update indicator */}
                {wsConnected && lastUpdate && (
                  <div className="absolute top-0 right-0 z-10">
                    <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span>MAJ temps réel</span>
                    </div>
                  </div>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={queue.map((item: QueueEntry) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {queue.map((entry: QueueEntry) => (
                        <SortableQueueItem
                          key={entry.id}
                          entry={entry}
                          onMoveUp={() => handleMoveUp(entry)}
                          onMoveDown={() => handleMoveDown(entry)}
                          onDelete={() => handleDelete(entry)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
