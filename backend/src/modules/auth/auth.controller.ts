import type { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service.js";
import { createSuccessResponse, createErrorResponse } from "../../common/lib/api-response.js";
import { setRefreshTokenCookie, clearRefreshTokenCookie } from "../../common/utils/cookie.js";
import { env } from "../../config/env.js";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await authService.registerUser(req.body);
    setRefreshTokenCookie(res, session.refreshToken);
    return res.status(201).json(createSuccessResponse(session));
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await authService.loginUser(req.body);
    setRefreshTokenCookie(res, session.refreshToken);
    return res.status(200).json(createSuccessResponse(session));
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: bodyRefreshToken } = req.body as { refreshToken?: string };
    const refreshToken = bodyRefreshToken || req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];
    if (!refreshToken) {
      return res.status(401).json(createErrorResponse("Refresh token is required", 401));
    }

    const session = await authService.refreshUserTokens(refreshToken);
    setRefreshTokenCookie(res, session.refreshToken);
    return res.status(200).json(createSuccessResponse(session));
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: bodyRefreshToken } = req.body as { refreshToken?: string };
    const refreshToken = bodyRefreshToken || req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];
    const userId = req.auth?.id;
    await authService.logoutUser(refreshToken, userId);
    clearRefreshTokenCookie(res);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) {
      return res.status(401).json(createErrorResponse("Unauthorized", 401));
    }
    return res.status(200).json(createSuccessResponse(req.auth));
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) {
      return res.status(401).json(createErrorResponse("Unauthorized", 401));
    }

    const updated = await authService.updateUserProfile(req.auth.id, req.body);
    return res.status(200).json(createSuccessResponse(updated));
  } catch (error) {
    next(error);
  }
}
