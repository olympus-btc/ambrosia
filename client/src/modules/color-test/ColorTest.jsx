"use client";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Chip,
  Progress,
  Switch,
  Checkbox,
} from "@heroui/react";

export default function ColorTest() {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Test de Colores HeroUI</h2>
        </CardHeader>
        <CardBody className="space-y-4">

          {/* Botones */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Botones</h3>
            <div className="flex flex-wrap gap-2">
              <Button color="primary">Primary</Button>
              <Button color="secondary">Secondary</Button>
              <Button color="success">Success</Button>
              <Button color="warning">Warning</Button>
              <Button color="danger">Danger</Button>
              <Button color="default">Default</Button>
            </div>
          </div>

          {/* Botones Variantes */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Variantes</h3>
            <div className="flex flex-wrap gap-2">
              <Button color="primary" variant="solid">Solid</Button>
              <Button color="primary" variant="bordered">Bordered</Button>
              <Button color="primary" variant="light">Light</Button>
              <Button color="primary" variant="flat">Flat</Button>
              <Button color="primary" variant="faded">Faded</Button>
              <Button color="primary" variant="shadow">Shadow</Button>
              <Button color="primary" variant="ghost">Ghost</Button>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Inputs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input color="primary" label="Primary Input" placeholder="Escribe algo..." />
              <Input color="secondary" label="Secondary Input" placeholder="Escribe algo..." />
              <Input color="success" label="Success Input" placeholder="Escribe algo..." />
              <Input color="warning" label="Warning Input" placeholder="Escribe algo..." />
            </div>
          </div>

          {/* Chips */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Chips</h3>
            <div className="flex flex-wrap gap-2">
              <Chip color="primary">Primary</Chip>
              <Chip color="secondary">Secondary</Chip>
              <Chip color="success">Success</Chip>
              <Chip color="warning">Warning</Chip>
              <Chip color="danger">Danger</Chip>
              <Chip color="default">Default</Chip>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Progress</h3>
            <div className="space-y-2">
              <Progress color="primary" value={60} />
              <Progress color="secondary" value={40} />
              <Progress color="success" value={80} />
              <Progress color="warning" value={30} />
              <Progress color="danger" value={90} />
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Controls</h3>
            <div className="flex flex-wrap gap-4">
              <Switch color="primary" defaultSelected>Primary Switch</Switch>
              <Switch color="secondary" defaultSelected>Secondary Switch</Switch>
              <Switch color="success" defaultSelected>Success Switch</Switch>
            </div>
            <div className="flex flex-wrap gap-4">
              <Checkbox color="primary" defaultSelected>Primary</Checkbox>
              <Checkbox color="secondary" defaultSelected>Secondary</Checkbox>
              <Checkbox color="success" defaultSelected>Success</Checkbox>
            </div>
          </div>

        </CardBody>
      </Card>
    </div>
  );
}
