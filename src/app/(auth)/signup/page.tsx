import { redirect } from "next/navigation";

export default function SignupPage() {
  redirect("/teacher-auth?mode=signup");
}