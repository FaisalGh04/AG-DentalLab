/**
 * Doctor roster entry as returned to the ADMIN client.
 *
 * `code` is the public portal credential, so this DTO is admin-only — it is
 * never part of any public response.
 */
export interface DoctorDTO {
  id: string;
  /** Stored WITH the "Dr. " prefix. */
  name: string;
  /** ag-{letters}{sequence}-{random4} */
  code: string;
  codeLetters: string;
  sequence: number;
  isActive: boolean;
  /** Null = never rotated. */
  codeRotatedAt: string | null;
  createdAt: string;
  /** How many cases link to this doctor — drives the delete warning. */
  caseCount: number;
}
