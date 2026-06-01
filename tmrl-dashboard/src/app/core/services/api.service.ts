import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, delay, defer, of, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiConnectionState } from '../models';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly settingsService = inject(SettingsService);

  readonly connectionState = signal<ApiConnectionState>({
    status: environment.useMockApi ? 'mock' : 'checking',
    mode: environment.useMockApi ? 'mock' : 'http',
    checkedAt: new Date().toISOString(),
    message: environment.useMockApi ? 'Mock data active' : 'Waiting for first API call',
  });

  get<T>(path: string, mockFactory: () => T): Observable<T> {
    if (this.shouldUseMockData()) {
      return this.mock(mockFactory, 'Mock data active');
    }

    this.markChecking();

    return this.http.get<T>(this.url(path), { headers: this.headers() }).pipe(
      tap(() => this.markConnected('HTTP API online')),
      catchError((error: unknown) => this.handleError(error)),
    );
  }

  post<TRequest, TResponse>(
    path: string,
    body: TRequest,
    mockFactory: () => TResponse,
  ): Observable<TResponse> {
    if (this.shouldUseMockData()) {
      return this.mock(mockFactory, 'Mock action');
    }

    this.markChecking();

    return this.http.post<TResponse>(this.url(path), body, { headers: this.headers() }).pipe(
      tap(() => this.markConnected('HTTP API online')),
      catchError((error: unknown) => this.handleError(error)),
    );
  }

  delete<T>(path: string, mockFactory: () => T): Observable<T> {
    if (this.shouldUseMockData()) {
      return this.mock(mockFactory, 'Mock action');
    }

    this.markChecking();

    return this.http.delete<T>(this.url(path), { headers: this.headers() }).pipe(
      tap(() => this.markConnected('HTTP API online')),
      catchError((error: unknown) => this.handleError(error)),
    );
  }

  download(path: string, mockFactory: () => Blob): Observable<Blob> {
    if (this.shouldUseMockData()) {
      return this.mock(mockFactory, 'Mock download');
    }

    this.markChecking();

    return this.http.get(this.url(path), { headers: this.headers(), responseType: 'blob' }).pipe(
      tap(() => this.markConnected('HTTP API online')),
      catchError((error: unknown) => this.handleError(error)),
    );
  }

  private mock<T>(factory: () => T, message: string): Observable<T> {
    return defer(() => {
      this.connectionState.set({
        status: 'mock',
        mode: 'mock',
        checkedAt: new Date().toISOString(),
        message,
      });

      return of(factory()).pipe(delay(220));
    });
  }

  private shouldUseMockData(): boolean {
    return this.settingsService.getSnapshot().useMockData;
  }

  private url(path: string): string {
    const baseUrl = this.settingsService.getSnapshot().apiUrl || environment.apiUrl;
    return `${baseUrl.replace(/\/$/, '')}${path}`;
  }

  private headers(): HttpHeaders {
    const token = this.settingsService.getSnapshot().apiToken;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private markChecking(): void {
    this.connectionState.set({
      status: 'checking',
      mode: 'http',
      checkedAt: new Date().toISOString(),
      message: 'Checking API',
    });
  }

  private markConnected(message: string): void {
    this.connectionState.set({
      status: 'connected',
      mode: 'http',
      checkedAt: new Date().toISOString(),
      message,
    });
  }

  private handleError(error: unknown): Observable<never> {
    this.connectionState.set({
      status: 'offline',
      mode: 'http',
      checkedAt: new Date().toISOString(),
      message: 'API unavailable',
    });

    return throwError(() => error);
  }
}
