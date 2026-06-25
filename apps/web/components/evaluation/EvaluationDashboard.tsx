// @ts-nocheck
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
} from "lucide-react";

interface EvaluationDashboardProps {
  orgId: string;
}

export function EvaluationDashboard({ orgId }: EvaluationDashboardProps) {
  const stats = useQuery(api.evaluation.evaluator.getEvaluationStats, {
    orgId,
    days: 30,
  });

  const recentEvaluations = useQuery(api.evaluation.evaluator.getEvaluations, {
    orgId,
    limit: 10,
  });

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading evaluation data...</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 0.8) return "default";
    if (score >= 0.6) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Evaluation Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor AI response quality and identify areas for improvement
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Evaluations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Quality Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(stats.avgQualityScore)}`}>
              {(stats.avgQualityScore * 100).toFixed(1)}%
            </div>
            <Progress value={stats.avgQualityScore * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hallucinations Detected</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.hallucinationsDetected}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.hallucinationsDetected / stats.total) * 100).toFixed(1)}% of responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.needsReview}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.needsReview / stats.total) * 100).toFixed(1)}% of responses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quality Metrics</CardTitle>
            <CardDescription>Breakdown of AI response quality scores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Confidence Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Confidence</span>
                <span className={`text-sm font-bold ${getScoreColor(stats.avgConfidenceScore)}`}>
                  {(stats.avgConfidenceScore * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.avgConfidenceScore * 100} />
            </div>

            {/* Relevance Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Relevance</span>
                <span className={`text-sm font-bold ${getScoreColor(stats.avgRelevanceScore)}`}>
                  {(stats.avgRelevanceScore * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.avgRelevanceScore * 100} />
            </div>

            {/* Accuracy Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Accuracy</span>
                <span className={`text-sm font-bold ${getScoreColor(stats.avgAccuracyScore)}`}>
                  {(stats.avgAccuracyScore * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.avgAccuracyScore * 100} />
            </div>

            {/* Hallucination Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Hallucination Rate</span>
                <span
                  className={`text-sm font-bold ${getScoreColor(1 - stats.avgHallucinationScore)}`}
                >
                  {(stats.avgHallucinationScore * 100).toFixed(1)}%
                </span>
              </div>
              <Progress
                value={stats.avgHallucinationScore * 100}
                className="[&>div]:bg-red-500"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Feedback</CardTitle>
            <CardDescription>Direct customer satisfaction ratings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.withCustomerFeedback > 0 ? (
              <>
                <div className="text-center">
                  <div className="text-4xl font-bold">
                    {stats.withCustomerFeedback}
                  </div>
                  <p className="text-sm text-muted-foreground">Customer ratings received</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">
                    {((stats.withCustomerFeedback / stats.total) * 100).toFixed(1)}% response rate
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No customer feedback yet</p>
                <p className="text-xs mt-2">Enable feedback requests to collect data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Evaluations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Evaluations</CardTitle>
          <CardDescription>Latest AI response quality assessments</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvaluations && recentEvaluations.length > 0 ? (
            <div className="space-y-4">
              {recentEvaluations.map((evaluation) => (
                <div
                  key={evaluation._id}
                  className="flex items-start justify-between border-b pb-4 last:border-0"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getScoreBadgeVariant(evaluation.qualityScore)}>
                        Quality: {(evaluation.qualityScore * 100).toFixed(0)}%
                      </Badge>
                      {evaluation.hasHallucination && (
                        <Badge variant="destructive">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Hallucination
                        </Badge>
                      )}
                      {evaluation.needsReview && (
                        <Badge variant="secondary">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Needs Review
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      Query: {evaluation.query}
                    </p>
                    <p className="text-sm line-clamp-2">{evaluation.response}</p>
                  </div>
                  <div className="ml-4 text-right text-xs text-muted-foreground">
                    {new Date(evaluation.evaluatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>No evaluations yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {(stats.hallucinationsDetected > stats.total * 0.1 ||
        stats.avgQualityScore < 0.7) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Quality Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-yellow-900">
            {stats.hallucinationsDetected > stats.total * 0.1 && (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p className="text-sm">
                  High hallucination rate detected (
                  {((stats.hallucinationsDetected / stats.total) * 100).toFixed(1)}%). Review AI
                  training data and prompts.
                </p>
              </div>
            )}
            {stats.avgQualityScore < 0.7 && (
              <div className="flex items-start gap-2">
                <TrendingDown className="h-4 w-4 mt-0.5" />
                <p className="text-sm">
                  Quality score below target ({(stats.avgQualityScore * 100).toFixed(1)}%).
                  Consider improving context or fine-tuning models.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
