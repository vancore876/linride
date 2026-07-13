import type { Metadata } from "next";
import { AdminLoginScreen } from "@/components/AdminLoginScreen";

export const metadata: Metadata = {
  title: "Control Room | Lin Ride",
  robots: {
    index: false,
    follow: false,
    nocache: true
  }
};

export default function LinRideControlRoomLogin() {
  return <AdminLoginScreen />;
}
