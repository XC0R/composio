import {
  AppInfoResponseDto,
  AppListResDTO,
  SingleAppInfoResDTO,
} from "../client";
import apiClient from "../client/client";
import { CEG } from "../utils/error";
import { TELEMETRY_LOGGER } from "../utils/telemetry";
import { TELEMETRY_EVENTS } from "../utils/telemetry/events";

import { z } from "zod";
import {
  ZGetAppParams,
  ZGetRequiredParams,
  ZGetRequiredParamsForAuthScheme,
  ZRequiredParamsFullResponse,
  ZRequiredParamsResponse,
} from "../types/app";
import { BackendClient } from "./backendClient";

// schema types generated from zod
export type GetRequiredParams = z.infer<typeof ZGetRequiredParams>;
export type GetRequiredParamsForAuthScheme = z.infer<
  typeof ZGetRequiredParamsForAuthScheme
>;
export type RequiredParamsFullResponse = z.infer<
  typeof ZRequiredParamsFullResponse
>;
export type RequiredParamsResponse = z.infer<typeof ZRequiredParamsResponse>;
export type GetAppDataParams = z.infer<typeof ZGetAppParams>;

// types generated from backend client
export type AppItemResponse = SingleAppInfoResDTO;
export type AppListResponse = AppItemListResponse[];
export type ListAllAppsResponse = AppListResDTO;
export type AppItemListResponse = AppInfoResponseDto;

export class Apps {
  private backendClient: BackendClient;
  private fileName: string = "js/src/sdk/models/apps.ts";
  constructor(backendClient: BackendClient) {
    this.backendClient = backendClient;
  }

  /**
   * Retrieves a list of all available apps in the Composio platform.
   *
   * This method allows clients to explore and discover the supported apps. It returns an array of app objects, each containing essential details such as the app's key, name, description, logo, categories, and unique identifier.
   *
   * @returns {Promise<AppItemListResponse[]>} A promise that resolves to the list of all apps.
   * @throws {ComposioError} If the request fails.
   */
  async list(): Promise<AppListResponse> {
    TELEMETRY_LOGGER.manualTelemetry(TELEMETRY_EVENTS.SDK_METHOD_INVOKED, {
      method: "list",
      file: this.fileName,
      params: {},
    });
    try {
      const { data } = await apiClient.apps.getApps();
      return data?.items || [];
    } catch (error) {
      throw CEG.handleAllError(error);
    }
  }

  /**
   * Retrieves details of a specific app in the Composio platform.
   *
   * This method allows clients to fetch detailed information about a specific app by providing its unique key. The response includes the app's name, key, status, description, logo, categories, authentication schemes, and other metadata.
   *
   * @param {GetAppDataParams} data The data for the request, including the app's unique key.
   * @returns {Promise<AppItemResponse>} A promise that resolves to the details of the app.
   * @throws {ComposioError} If the request fails.
   */
  async get(data: GetAppDataParams): Promise<AppItemResponse> {
    TELEMETRY_LOGGER.manualTelemetry(TELEMETRY_EVENTS.SDK_METHOD_INVOKED, {
      method: "get",
      file: this.fileName,
      params: { data },
    });
    try {
      const { data: response } = await apiClient.apps.getApp({
        path: {
          appName: data.appKey,
        },
      });
      if (!response) throw new Error("App not found");
      return response;
    } catch (error) {
      throw CEG.handleAllError(error);
    }
  }

  /**
   * Retrieves the required parameters for a specific app in the Composio platform.
   *
   * This method allows clients to fetch the necessary parameters for a specific app by providing its unique key. The response includes the app's name, key, status, description, logo, categories, authentication schemes, and other metadata.
   *
   * @param {string} appId The unique key of the app.
   * @returns {Promise<RequiredParamsFullResponse>} A promise that resolves to the required parameters for the app.
   * @throws {ComposioError} If the request fails.
   */
  async getRequiredParams(appId: string): Promise<RequiredParamsFullResponse> {
    TELEMETRY_LOGGER.manualTelemetry(TELEMETRY_EVENTS.SDK_METHOD_INVOKED, {
      method: "getRequiredParams",
      file: this.fileName,
      params: { appId },
    });
    try {
      ZGetRequiredParams.parse({ appId });
      const appData = await this.get({ appKey: appId });
      if (!appData) throw new Error("App not found");
      const authSchemes = appData.auth_schemes;
      const availableAuthSchemes = (
        authSchemes as Array<{ mode: string }>
      )?.map((scheme) => scheme?.mode);

      const authSchemesObject: Record<string, RequiredParamsResponse> = {};

      for (const scheme of authSchemes as Array<{
        mode: string;
        fields: Array<{
          name: string;
          required: boolean;
          expected_from_customer: boolean;
        }>;
      }>) {
        const name = scheme.mode;
        authSchemesObject[name] = {
          required_fields: [],
          optional_fields: [],
          expected_from_user: [],
        };

        scheme.fields.forEach((field) => {
          const isExpectedForIntegrationSetup =
            field.expected_from_customer === false;
          const isRequired = field.required;

          if (isExpectedForIntegrationSetup) {
            if (isRequired) {
              authSchemesObject[name].expected_from_user.push(field.name);
            } else {
              authSchemesObject[name].optional_fields.push(field.name);
            }
          } else {
            authSchemesObject[name].required_fields.push(field.name);
          }
        });
      }

      return {
        availableAuthSchemes,
        authSchemes: authSchemesObject,
      };
    } catch (error) {
      throw CEG.handleAllError(error);
    }
  }

  /**
   * Retrieves the required parameters for a specific authentication scheme of an app in the Composio platform.
   *
   * This method allows clients to fetch the necessary parameters for a specific authentication scheme of an app by providing its unique key and the authentication scheme.
   *
   * @param {GetRequiredParamsForAuthScheme} data The data for the request, including the app's unique key and the authentication scheme.
   * @returns {Promise<RequiredParamsResponse>} A promise that resolves to the required parameters for the authentication scheme.
   * @throws {ComposioError} If the request fails.
   */
  async getRequiredParamsForAuthScheme({
    appId,
    authScheme,
  }: GetRequiredParamsForAuthScheme): Promise<RequiredParamsResponse> {
    TELEMETRY_LOGGER.manualTelemetry(TELEMETRY_EVENTS.SDK_METHOD_INVOKED, {
      method: "getRequiredParamsForAuthScheme",
      file: this.fileName,
      params: { appId, authScheme },
    });
    try {
      ZGetRequiredParamsForAuthScheme.parse({ appId, authScheme });
      const params = await this.getRequiredParams(appId);
      return params.authSchemes[authScheme];
    } catch (error) {
      throw CEG.handleAllError(error);
    }
  }
}
