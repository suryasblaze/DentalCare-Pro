import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom'; // Import Link
import { PageHeader } from '@/components/ui/page-header';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api'; // Import the api object
import type { Database } from '@/lib/database.types'; // Import database types

// Define PatientRow type based on database types
type PatientRow = Database['public']['Tables']['patients']['Row'];

export function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState<PatientRow[]>([]); // Use PatientRow type
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // State for errors

  useEffect(() => {
    if (query) {
      console.log(`Fetching patient search results for: ${query}`);
      setLoading(true);
      setError(null); // Reset error state

      // --- Actual API call to search patients ---
      api.patients.search(query)
        .then(data => {
          setResults(data || []); // Set results, ensure it's an array
          setLoading(false);
        })
        .catch(err => {
          console.error("Patient search failed:", err);
          setError(err.message || "Failed to fetch patient search results.");
          setResults([]); // Clear results on error
          setLoading(false);
        });
      // --- End API Call ---

    } else {
      setResults([]); // Clear results if no query
      setError(null);
    }
    // No cleanup needed for the API call itself unless using AbortController
  }, [query]); // Re-run effect when query changes

  return (
    <div className="space-y-6">
      <PageHeader
        heading={`Search Results for "${query || ''}"`}
        text={loading ? 'Searching patients...' : error ? 'Error fetching results' : `Found ${results.length} patient results.`}
      />

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center text-red-600 py-10">
          <p>Error: {error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.length > 0 ? (
            results.map((patient) => (
              <div key={patient.id} className="border p-4 rounded-md shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold">{patient.first_name} {patient.last_name}</h3>
                {patient.email && <p className="text-sm text-muted-foreground">Email: {patient.email}</p>}
                {patient.phone && <p className="text-sm text-muted-foreground">Phone: {patient.phone}</p>}
                {/* Add a link to the patient details page */}
                <Link to={`/patients/${patient.id}`} className="text-blue-600 hover:underline text-sm mt-1 inline-block">
                  View Details
                </Link>
              </div>
            ))
          ) : (
            !loading && query && <p className="text-center text-muted-foreground">No patient results found for "{query}".</p>
          )}
          {!query && <p className="text-center text-muted-foreground">Please enter a search term in the header.</p>}
        </div>
      )}
    </div>
  );
}

export default SearchResultsPage;
