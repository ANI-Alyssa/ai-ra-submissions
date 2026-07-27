export type Department =
  | "MARKETING"
  | "PODCAST"
  | "OPERATIONS"
  | "TECH"
  | "PROGRAM"
  | "CONTENT"
  | "EA_SUPPORT";

export interface SubmissionInput {
  submittedBy: string;
  taskName: string;
  dueDate: string;
  timeEstimate: string;
  assetsToReview: string;
  decisionNeeded: string;
  publishDate: string | null;
  department: Department;
  loomLink: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  freeformNotes: string | null;
  /** Prior AI reviews for this submission, oldest first — gives the model revision context. */
  priorReviews: Array<{
    versionNumber: number;
    overallScore: number;
    reasons: string[];
    missingInformation: string[];
  }>;
}

export interface AIReviewScores {
  contextScore: number;
  decisionScore: number;
  evidenceScore: number;
  recommendScore: number;
  organizationScore: number;
  readabilityScore: number;
  overallScore: number;
  confidence: number;
}

export interface AIReviewResult extends AIReviewScores {
  approved: boolean;
  riskLevel: "low" | "medium" | "high";
  estimatedReviewSeconds: number;
  reasons: string[];
  missingInformation: string[];
  recommendations: string[];
  suggestedRewrite: string | null;
  reviewTips: string[];
  loomRequiredButMissing: boolean;
  rawModelResponse: string;
}

export interface AIProvider {
  reviewSubmission(input: SubmissionInput): Promise<AIReviewResult>;
}
