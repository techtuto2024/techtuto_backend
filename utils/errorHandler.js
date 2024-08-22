const TryCatch = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error('Error caught:', error);
      
      if (res && typeof res.status === 'function') {
        res.status(500).json({
          message: error.message || 'Internal Server Error',
          code: error.code || 'UNKNOWN_ERROR'
        });
      } else {
        console.error('Unable to send error response:', error);
      }
      console.error('Error details:', error);
    }
  };
};

export default TryCatch;