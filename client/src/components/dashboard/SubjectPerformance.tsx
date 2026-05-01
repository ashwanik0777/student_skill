import { useUserSubjectPerformance } from "@/hooks/useSubjects";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectPerformance() {
  const { data: subjectPerformance, isLoading } = useUserSubjectPerformance();

  return (
    <div className="mt-8">
      <h4 className="text-md font-medium mb-4">Subject Performance</h4>
      
      <div className="space-y-4">
        {isLoading ? (
          // Loading state
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <Skeleton className="h-8 w-8 rounded-full mr-3" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ))
        ) : (
          // Subject performance data
          subjectPerformance?.map((performance) => {
            const { subject } = performance;
            const colorClass = subject.color;
            
            return (
              <div key={subject.id} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <span className={`flex items-center justify-center h-8 w-8 rounded-full bg-${colorClass}-light mr-3`}>
                      <span className={`material-icons text-${colorClass} text-sm`}>{subject.icon}</span>
                    </span>
                    <span className="font-medium">{subject.displayName}</span>
                  </div>
                  <span className={`font-semibold text-${colorClass}`}>{performance.averageScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`bg-${colorClass} h-2.5 rounded-full`} 
                    style={{ width: `${performance.averageScore}%` }}
                  ></div>
                </div>
              </div>
            );
          })
        )}
        
        {!isLoading && (!subjectPerformance || subjectPerformance.length === 0) && (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <span className="material-icons text-gray-400 text-3xl mb-2">bar_chart</span>
            <p className="text-gray-500">No subject performance data available</p>
            <p className="text-sm text-gray-400 mt-1">Complete tests to see your performance</p>
          </div>
        )}
      </div>
    </div>
  );
}
