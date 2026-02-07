export class WindiError extends Error {
  constructor(message, { code = "WINDI_ERROR", details = undefined } = {}) {
    super(message);
    this.name = "WindiError";
    this.code = code;
    this.details = details;
  }
}

export class WindiHttpError extends WindiError {
  constructor(message, { status, data, requestId } = {}) {
    super(message, { code: "WINDI_HTTP_ERROR", details: { status, data, requestId } });
    this.name = "WindiHttpError";
    this.status = status;
    this.data = data;
    this.requestId = requestId;
  }
}

export class WindiConfigError extends WindiError {
  constructor(message, details) {
    super(message, { code: "WINDI_CONFIG_ERROR", details });
    this.name = "WindiConfigError";
  }
}
