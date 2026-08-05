-- Drop publishDate column: no longer collected, keep only Due Date per direct feedback
ALTER TABLE "Submission" DROP COLUMN "publishDate";
