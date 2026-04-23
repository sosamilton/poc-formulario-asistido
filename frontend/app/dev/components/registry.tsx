"use client"

import type { ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SonnerToaster } from "@/components/ui/sonner-toaster"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type UsageStatus = "used" | "orphan"

export interface ComponentEntry {
  name: string
  file: string
  status: UsageStatus
  consumers: string[]
  purpose: string
  preview: ReactNode
}

export const REGISTRY: ComponentEntry[] = [
  {
    name: "button",
    file: "components/ui/button.tsx",
    status: "used",
    consumers: [
      "app/liquidar/page.tsx",
      "app/presentar/page.tsx",
      "components/survey-form.tsx",
    ],
    purpose: "Botón primario/secundario base para acciones.",
    preview: (
      <div className="flex flex-wrap gap-2">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
      </div>
    ),
  },
  {
    name: "dialog",
    file: "components/ui/dialog.tsx",
    status: "used",
    consumers: ["components/survey-form.tsx"],
    purpose: "Modal accesible, usado para el aviso de rectificación.",
    preview: (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Abrir diálogo</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ejemplo de Dialog</DialogTitle>
            <DialogDescription>
              Contenido estándar de un modal con header y body.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Este patrón se reutiliza para confirmaciones simples.
          </p>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    name: "sonner-toaster",
    file: "components/ui/sonner-toaster.tsx",
    status: "used",
    consumers: ["app/layout.tsx"],
    purpose: "Provider de toasts (sonner). Se monta una vez en el layout.",
    preview: (
      <div className="space-y-2">
        <SonnerToaster />
        <div className="flex gap-2">
          <Button onClick={() => toast.success("Todo ok")}>Toast success</Button>
          <Button variant="destructive" onClick={() => toast.error("Algo falló")}>Toast error</Button>
        </div>
      </div>
    ),
  },
  {
    name: "skeleton",
    file: "components/ui/skeleton.tsx",
    status: "orphan",
    consumers: [],
    purpose: "Placeholder de carga animado.",
    preview: (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    ),
  },
  {
    name: "card",
    file: "components/ui/card.tsx",
    status: "orphan",
    consumers: [],
    purpose: "Contenedor con header, body y footer opcionales.",
    preview: (
      <Card className="w-72">
        <CardHeader>
          <CardTitle>Datos del contribuyente</CardTitle>
          <CardDescription>Resumen compacto.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ideal para agrupar totales, indicadores o mensajes.
          </p>
        </CardContent>
        <CardFooter>
          <CardAction>
            <Button size="sm">Acción</Button>
          </CardAction>
        </CardFooter>
      </Card>
    ),
  },
  {
    name: "badge",
    file: "components/ui/badge.tsx",
    status: "orphan",
    consumers: [],
    purpose: "Chip pequeño para estados o etiquetas.",
    preview: (
      <div className="flex flex-wrap gap-2">
        <Badge>Nuevo</Badge>
        <Badge variant="secondary">Pendiente</Badge>
        <Badge variant="destructive">Vencido</Badge>
        <Badge variant="outline">Manual</Badge>
      </div>
    ),
  },
  {
    name: "tabs",
    file: "components/ui/tabs.tsx",
    status: "orphan",
    consumers: [],
    purpose: "Pestañas para secciones relacionadas.",
    preview: (
      <Tabs defaultValue="a" className="w-80">
        <TabsList>
          <TabsTrigger value="a">Resumen</TabsTrigger>
          <TabsTrigger value="b">Detalle</TabsTrigger>
        </TabsList>
        <TabsContent value="a" className="rounded-md border p-4">
          Contenido del resumen.
        </TabsContent>
        <TabsContent value="b" className="rounded-md border p-4">
          Información detallada.
        </TabsContent>
      </Tabs>
    ),
  },
  {
    name: "accordion",
    file: "components/ui/accordion.tsx",
    status: "orphan",
    consumers: [],
    purpose: "Bloques colapsables para FAQs o detalles secundarios.",
    preview: (
      <Accordion type="single" collapsible className="w-80">
        <AccordionItem value="a">
          <AccordionTrigger>¿Quién puede usar la DDJJ simple?</AccordionTrigger>
          <AccordionContent>
            Contribuyentes locales con una sola actividad elegible.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>¿Se puede rectificar?</AccordionTrigger>
          <AccordionContent>
            No en v1; se redirige al flujo legacy.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },
  {
    name: "spinner",
    file: "components/ui/spinner.tsx",
    status: "orphan",
    consumers: [],
    purpose: "Spinner simple para estados de carga.",
    preview: (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner />
        <span>Cargando información...</span>
      </div>
    ),
  },
  {
    name: "table",
    file: "components/ui/table.tsx",
    status: "orphan",
    consumers: [],
    purpose: "Tabla estilizada para listados compactos.",
    preview: (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Período</TableHead>
            <TableHead className="text-right">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Enero 2026</TableCell>
            <TableCell className="text-right">$152,50</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Diciembre 2025</TableCell>
            <TableCell className="text-right">$183,00</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
  },
]
