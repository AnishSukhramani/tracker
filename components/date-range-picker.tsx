"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { CalendarIcon } from "lucide-react"
import { format, subDays, startOfYear } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
  value: { from: Date; to: Date }
  onChange: (range: { from: Date; to: Date }) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handlePreset = (preset: string) => {
    const today = new Date()
    switch (preset) {
      case "last30":
        onChange({
          from: subDays(today, 30),
          to: today,
        })
        break
      case "ytd":
        onChange({
          from: startOfYear(today),
          to: today,
        })
        break
      case "custom":
        setIsOpen(true)
        break
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Date Range:</span>
          <Select
            onValueChange={handlePreset}
            defaultValue="last30"
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value?.from ? (
                value.to ? (
                  <>
                    {format(value.from, "LLL dd, y")} -{" "}
                    {format(value.to, "LLL dd, y")}
                  </>
                ) : (
                  format(value.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from}
              selected={{
                from: value?.from,
                to: value?.to,
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onChange({ from: range.from, to: range.to })
                  setIsOpen(false)
                } else if (range?.from) {
                  onChange({ from: range.from, to: range.from })
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  )
}

