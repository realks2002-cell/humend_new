"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, GripVertical, Trash2 } from "lucide-react";
import { formatWage } from "@/lib/utils/format";
import { EditClientButton } from "./client-form";
import { updateClientSortOrder, deleteClientAction } from "./actions";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ClientItem {
  id: string;
  company_name: string;
  location: string;
  hourly_wage: number;
  contact_person: string | null;
  contact_phone: string | null;
  dress_code: string | null;
  work_guidelines: string | null;
  description: string | null;
  main_image_url: string | null;
  latitude?: number | null;
  longitude?: number | null;
  client_photos?: { id: string; image_url: string; sort_order: number }[];
  [key: string]: unknown;
}

function SortableCard({ client, onDelete }: { client: ClientItem; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const coverImage =
    client.main_image_url ||
    client.client_photos?.[0]?.image_url ||
    null;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="overflow-hidden">
        <div className="relative aspect-[16/8] bg-muted overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt={client.company_name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Briefcase className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}
          <button
            className="absolute top-2 left-2 rounded-md bg-black/50 p-1.5 text-white cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{client.company_name}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {client.location}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <EditClientButton client={client} />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDelete(client.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline">
              시급 {formatWage(client.hourly_wage)}
            </Badge>
            {client.contact_person && (
              <Badge variant="secondary">
                담당: {client.contact_person}
              </Badge>
            )}
          </div>
          {client.dress_code && (
            <div className="mt-2 text-xs text-muted-foreground">
              복장: {client.dress_code}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DraggableClientList({ clients: initialClients }: { clients: ClientItem[] }) {
  const [clients, setClients] = useState(initialClients);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDelete = async (id: string) => {
    if (!confirm("이 고객사를 삭제하시겠습니까?")) return;
    const result = await deleteClientAction(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      setClients((prev) => prev.filter((c) => c.id !== id));
      toast.success("고객사가 삭제되었습니다.");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = clients.findIndex((c) => c.id === active.id);
    const newIndex = clients.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(clients, oldIndex, newIndex);
    setClients(reordered);

    const result = await updateClientSortOrder(reordered.map((c) => c.id));
    if (result.error) {
      toast.error(result.error);
      setClients(initialClients);
    } else {
      toast.success("순서가 저장되었습니다.");
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={clients.map((c) => c.id)} strategy={rectSortingStrategy}>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients.map((client) => (
            <SortableCard key={client.id} client={client} onDelete={handleDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
