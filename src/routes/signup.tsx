import { createFileRoute, Navigate } from "@tanstack/react-router";

// Cadastro público desativado — apenas administradores criam usuários.
export const Route = createFileRoute("/signup")({
  component: () => <Navigate to="/login" />,
});
