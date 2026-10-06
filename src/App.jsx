import { Button } from "@/components/ui/button";
function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600">
          Help Desk
        </h1>

        <p className="mt-4 text-gray-600">
          Welcome to the Help Desk
        </p>

    <Button variant="default" size="default" className="mt-6">
      Get Started
    </Button>
      </div>
    </div>
  )
}

export default App