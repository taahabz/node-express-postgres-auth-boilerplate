type RouteMetric = {
  count: number;
  errors: number;
  totalDurationMs: number;
};

type EmailMetric = {
  success: number;
  failure: number;
};

type MetricsState = {
  startedAt: number;
  requests: {
    total: number;
    errors: number;
    byRoute: Record<string, RouteMetric>;
  };
  rateLimits: Record<string, number>;
  emails: Record<string, EmailMetric>;
};

const state: MetricsState = {
  startedAt: Date.now(),
  requests: {
    total: 0,
    errors: 0,
    byRoute: {},
  },
  rateLimits: {},
  emails: {},
};

const getOrCreateRouteMetric = (route: string): RouteMetric => {
  if (!state.requests.byRoute[route]) {
    state.requests.byRoute[route] = {
      count: 0,
      errors: 0,
      totalDurationMs: 0,
    };
  }

  return state.requests.byRoute[route];
};

const getOrCreateEmailMetric = (provider: string): EmailMetric => {
  if (!state.emails[provider]) {
    state.emails[provider] = {
      success: 0,
      failure: 0,
    };
  }

  return state.emails[provider];
};

export const recordRequestMetric = (input: {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
}): void => {
  state.requests.total += 1;

  if (input.statusCode >= 400) {
    state.requests.errors += 1;
  }

  const routeMetric = getOrCreateRouteMetric(`${input.method} ${input.route}`);
  routeMetric.count += 1;
  routeMetric.totalDurationMs += input.durationMs;

  if (input.statusCode >= 400) {
    routeMetric.errors += 1;
  }
};

export const recordRateLimitHit = (scope: string): void => {
  state.rateLimits[scope] = (state.rateLimits[scope] ?? 0) + 1;
};

export const recordEmailDelivery = (provider: string, success: boolean): void => {
  const metric = getOrCreateEmailMetric(provider);

  if (success) {
    metric.success += 1;
    return;
  }

  metric.failure += 1;
};

export const getMetricsSnapshot = () => ({
  uptimeSeconds: Math.floor((Date.now() - state.startedAt) / 1000),
  requests: {
    total: state.requests.total,
    errors: state.requests.errors,
    byRoute: Object.fromEntries(
      Object.entries(state.requests.byRoute).map(([route, metric]) => [
        route,
        {
          count: metric.count,
          errors: metric.errors,
          averageDurationMs: metric.count > 0 ? Number((metric.totalDurationMs / metric.count).toFixed(2)) : 0,
        },
      ])
    ),
  },
  rateLimits: { ...state.rateLimits },
  emails: { ...state.emails },
});