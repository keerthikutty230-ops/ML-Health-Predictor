import { NextResponse } from "next/server";

export async function GET() {
  const cities = [{city:"Los Angeles",state:"CA"},{city:"San Francisco",state:"CA"},{city:"Chicago",state:"IL"},{city:"Boston",state:"MA"},{city:"New York",state:"NY"},{city:"Houston",state:"TX"}];
  return NextResponse.json({ status: "healthy", model_loaded: true, patients_in_db: 500, hospitals_available: 23, cities_available: cities });
}