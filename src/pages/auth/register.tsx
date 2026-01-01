import Link from "next/link";
import { Button } from "@/components/ui/button";
import {  Label } from "@/components/ui/field";
import { TextField } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function RegisterPage() {
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onDynamic: registerSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signUp.email({
        name: value.name,
        email: value.email,
        password: value.password,
      });

      if (error) {
        form.setFieldValue("name", value.name);
        form.setFieldValue("email", value.email);
        form.setFieldValue("password", value.password);
        return { error: error.message };
      }

      window.location.href = "/auth/login";
      return {};
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold">Register</h1>
        <form.Field name="name">
          {(field) => (
            <TextField
              value={field.state.value}
              onChange={(value) => field.handleChange(value)}
              onBlur={field.handleBlur}
            >
              <Label>Name</Label>
              <Input />
            </TextField>
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <TextField
              type="email"
              value={field.state.value}
              onChange={(value) => field.handleChange(value)}
              onBlur={field.handleBlur}
            >
              <Label>Email</Label>
              <Input />
            </TextField>
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <TextField
              type="password"
              value={field.state.value}
              onChange={(value) => field.handleChange(value)}
              onBlur={field.handleBlur}
            >
              <Label>Password</Label>
              <Input />
            </TextField>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" isDisabled={!canSubmit} className="w-full">
              {isSubmitting ? "Creating account..." : "Register"}
            </Button>
          )}
        </form.Subscribe>
        <p className="text-sm text-center text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
