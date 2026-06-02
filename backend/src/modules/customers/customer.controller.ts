import type { Request, Response, NextFunction } from "express";
import * as customerService from "./customer.service.js";
import { createSuccessResponse, createErrorResponse } from "../../common/lib/api-response.js";

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const created = await customerService.createCustomer(req.body);
    return res.status(201).json(createSuccessResponse(created));
  } catch (error) {
    next(error);
  }
}

export async function listCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = 1, pageSize = 50, search, whatsappOnly, location } = req.query as any;
    const result = await customerService.listCustomers({
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      whatsappOnly,
      location,
    });
    return res.status(200).json(createSuccessResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function getCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);
    if (!customer) return res.status(404).json(createErrorResponse("Customer not found", 404));
    return res.status(200).json(createSuccessResponse(customer));
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await customerService.updateCustomer(id, req.body);
    return res.status(200).json(createSuccessResponse(updated));
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await customerService.deleteCustomer(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
