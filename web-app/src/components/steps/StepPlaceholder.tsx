/**
 * Placeholder for steps under development
 */

export function StepPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-gray-600 mb-6">{description}</p>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            ⚙️ This step is under development and will be implemented soon.
          </p>
        </div>
      </div>
    </div>
  );
}
