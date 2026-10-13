import { redirect } from "next/navigation";

// Short link for housekeepers' phones: /my-rooms opens their suites.
export default function MyRooms() {
  redirect("/housekeeper");
}
