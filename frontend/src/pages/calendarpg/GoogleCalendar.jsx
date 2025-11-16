import GoogleDoctorCalendar from "./GoogleDoctorCalendar";
import PatientBooking from "./PatientBooking";
import { useAuth } from "../../auth/AuthContext";

export default function CalendarPage() {
  const { user } = useAuth(); // user.is_doctor or user.role === "doctor"
    console.log("User in CalendarPage:", user);
  if (!user) return null; // or a loading spinner

  if (user.is_doctor) {
    return <GoogleDoctorCalendar />;
  } else {
    return <PatientBooking />;
  }
}
