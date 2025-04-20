"use client";

import { useState, useEffect, useRef } from "react";
import { Doctor } from "@/types/doctor";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DoctorSearchProps {
  doctors: Doctor[];
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
}

export function DoctorSearch({
  doctors,
  value,
  onSelect,
  placeholder = "Search doctors...",
}: DoctorSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredDoctors, setFilteredDoctors] = useState(doctors);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update search term when value changes (doctor is selected)
  useEffect(() => {
    const selectedDoctor = doctors.find((doctor) => doctor.id === value);
    if (selectedDoctor) {
      setSearchTerm(selectedDoctor.full_name || "");
    }
  }, [value, doctors]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredDoctors(doctors);
    } else {
      const lowerSearch = searchTerm.toLowerCase().trim();
      setFilteredDoctors(
        doctors.filter((doctor) =>
          (doctor.full_name || "")
            .toLowerCase()
            .includes(lowerSearch)
        )
      );
    }
  }, [searchTerm, doctors]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (doctorId: string) => {
    onSelect(doctorId);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        className="w-full"
        autoComplete="off"
      />
      {showDropdown && filteredDoctors.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow max-h-60 overflow-auto">
          {filteredDoctors.map((doctor) => (
            <li
              key={doctor.id}
              onClick={() => handleSelect(doctor.id)}
              className={cn(
                "px-4 py-2 cursor-pointer hover:bg-blue-100 flex items-center",
                value === doctor.id && "bg-blue-50 font-semibold"
              )}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4 text-blue-500",
                  value === doctor.id ? "opacity-100" : "opacity-0"
                )}
              />
              {doctor.full_name}
            </li>
          ))}
        </ul>
      )}
      {showDropdown && filteredDoctors.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow px-4 py-2 text-gray-500">
          No doctors found.
        </div>
      )}
    </div>
  );
} 