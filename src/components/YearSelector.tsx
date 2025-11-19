import * as React from "react";
import { Check, ChevronsUpDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface YearSelectorProps {
    selectedYears: number[];
    availableYears: number[];
    onYearChange: (year: number) => void;
    onToggleAll: () => void;
    isCompareMode: boolean;
    onCompareModeChange: (isCompare: boolean) => void;
}

export function YearSelector({
    selectedYears,
    availableYears,
    onYearChange,
    onToggleAll,
    isCompareMode,
    onCompareModeChange,
}: YearSelectorProps) {
    const [open, setOpen] = React.useState(false);

    const sortedYears = [...availableYears].sort((a, b) => b - a);
    const allSelected = selectedYears.length === availableYears.length;

    const getButtonText = () => {
        if (allSelected) return "Todos los años";
        if (selectedYears.length === 0) return "Seleccionar año";
        if (selectedYears.length === 1) return `Año ${selectedYears[0]}`;
        return `${selectedYears.length} años seleccionados`;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full sm:w-[240px] justify-between bg-card/50 backdrop-blur-sm border-border/50 hover:bg-accent/50"
                >
                    <div className="flex items-center gap-2 truncate">
                        <Calendar className="h-4 w-4 opacity-50" />
                        <span className="truncate">{getButtonText()}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0 bg-card border-border/50 backdrop-blur-xl shadow-xl" align="start">
                <div className="p-4 border-b border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="compare-mode" className="text-sm font-medium">
                            Modo Comparación
                        </Label>
                        <Switch
                            id="compare-mode"
                            checked={isCompareMode}
                            onCheckedChange={onCompareModeChange}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {isCompareMode
                            ? "Selecciona múltiples años para comparar datos."
                            : "Selecciona un año para ver sus datos individuales."}
                    </p>
                </div>
                <Command className="bg-transparent">
                    <CommandList>
                        <CommandGroup heading="Opciones Rápidas">
                            <CommandItem
                                onSelect={() => {
                                    onToggleAll();
                                    if (!isCompareMode) setOpen(false);
                                }}
                                className="cursor-pointer"
                            >
                                <div
                                    className={cn(
                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                        allSelected
                                            ? "bg-primary text-primary-foreground"
                                            : "opacity-50 [&_svg]:invisible"
                                    )}
                                >
                                    <Check className={cn("h-4 w-4")} />
                                </div>
                                <span>Todos los años</span>
                            </CommandItem>
                        </CommandGroup>
                        <CommandSeparator className="bg-border/50" />
                        <CommandGroup heading="Años Disponibles">
                            {sortedYears.map((year) => {
                                const isSelected = selectedYears.includes(year);
                                return (
                                    <CommandItem
                                        key={year}
                                        onSelect={() => {
                                            onYearChange(year);
                                            if (!isCompareMode) setOpen(false);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <span>{year}</span>
                                        {isSelected && !isCompareMode && (
                                            <Badge variant="secondary" className="ml-auto text-[10px] h-5">
                                                Actual
                                            </Badge>
                                        )}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
