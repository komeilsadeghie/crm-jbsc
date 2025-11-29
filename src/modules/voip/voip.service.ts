export const getMonitoringPlaceholder = () => {
  return {
    status: 'pending',
    integrations: [],
    message: 'Issabel VOIP integration is not configured yet. This is a placeholder endpoint.',
  };
};

export const getVoipLogsPlaceholder = () => {
  return {
    status: 'pending',
    logs: [],
    message: 'VOIP logs will appear here after integrating with Issabel API.',
  };
};


