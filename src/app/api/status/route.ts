import { NextResponse } from "next/server";

export async function GET() {
  const cities = [
    { city: "Vijayawada", state: "Andhra Pradesh" },
    { city: "Visakhapatnam", state: "Andhra Pradesh" },
    { city: "Guntur", state: "Andhra Pradesh" },
    { city: "Tirupati", state: "Andhra Pradesh" },
    { city: "Kakinada", state: "Andhra Pradesh" },
    { city: "Rajahmundry", state: "Andhra Pradesh" },
    { city: "Nellore", state: "Andhra Pradesh" },
    { city: "Kurnool", state: "Andhra Pradesh" },
    { city: "Anantapur", state: "Andhra Pradesh" },
    { city: "Ongole", state: "Andhra Pradesh" },
    { city: "Eluru", state: "Andhra Pradesh" },
    { city: "Kadapa", state: "Andhra Pradesh" },
    { city: "Chittoor", state: "Andhra Pradesh" },
    { city: "Vizianagaram", state: "Andhra Pradesh" },
  ];
  return NextResponse.json({
    status: "healthy",
    model_loaded: true,
    patients_in_db: 500,
    hospitals_available: 33,
    cities_available: cities
  });
}