// @flow
import { map } from 'lodash';
import invariant from 'invariant';
import stores from 'stores';

type Options = {
  baseUrl?: string,
};

class ApiClient {
  baseUrl: string;
  userAgent: string;

  constructor(options: Options = {}) {
    this.baseUrl = options.baseUrl || '/api';
    this.userAgent = 'OutlineFrontend';
  }

  fetch = async (
    path: string,
    method: string,
    data: ?Object,
    options: Object = {}
  ) => {
    let body;
    let modifiedPath;

    if (method === 'GET') {
      if (data) {
        modifiedPath = `${path}?${data && this.constructQueryString(data)}`;
      } else {
        modifiedPath = path;
      }
    } else if (method === 'POST' || method === 'PUT') {
      body = data ? JSON.stringify(data) : undefined;
    }

    // Construct headers
    const headers = new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    });
    if (stores.auth.authenticated) {
      invariant(stores.auth.token, 'JWT token not set properly');
      headers.set('Authorization', `Bearer ${stores.auth.token}`);
    }

    let response;
    try {
      response = await fetch(this.baseUrl + (modifiedPath || path), {
        method,
        body,
        headers,
        redirect: 'follow',
        credentials: 'omit',
        cache: 'no-cache',
      });
    } catch (err) {
      if (window.navigator.onLine) {
        throw new Error('A network error occurred, try again?');
      } else {
        throw new Error('No internet connection available');
      }
    }

    if (response.status >= 200 && response.status < 300) {
      return response.json();
    }

    // Handle 401, log out user
    if (response.status === 401) {
      stores.auth.logout();
      return;
    }

    // Handle failed responses
    const error = {};
    error.statusCode = response.status;
    error.response = response;

    try {
      const parsed = await response.json();
      error.message = parsed.message || '';
      error.error = parsed.error;
      error.data = parsed.data;
    } catch (_err) {
      // we're trying to parse an error so JSON may not be valid
    }

    throw error;
  };

  get = (path: string, data: ?Object, options?: Object) => {
    return this.fetch(path, 'GET', data, options);
  };

  post = (path: string, data: ?Object, options?: Object) => {
    return this.fetch(path, 'POST', data, options);
  };

  // Helpers
  constructQueryString = (data: { [key: string]: string }) => {
    return map(
      data,
      (v, k) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
    ).join('&');
  };
}

export default ApiClient;

// In case you don't want to always initiate, just import with `import { client } ...`
export const client = new ApiClient();
