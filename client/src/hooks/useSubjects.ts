import { useQuery } from "@tanstack/react-query";
import { Subject, UserSubjectPerformance } from "@/types";

export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });
}

export function useSubject(subjectId: number) {
  return useQuery<Subject>({
    queryKey: [`/api/subjects/${subjectId}`],
    enabled: !!subjectId,
  });
}

export function useUserSubjectPerformance() {
  return useQuery<UserSubjectPerformance[]>({
    queryKey: ["/api/user/subject-performance"],
  });
}
