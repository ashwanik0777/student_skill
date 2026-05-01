import { useQuery } from "@tanstack/react-query";
import { User } from "@/types";

export function useUser() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/users/current"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error
  };
}
