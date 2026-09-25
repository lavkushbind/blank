import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect("/teacher-auth?mode=login");
}