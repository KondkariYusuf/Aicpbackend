"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.institutesController = void 0;
const institutes_schemas_1 = require("./institutes.schemas");
const institutes_service_1 = require("./institutes.service");
exports.institutesController = {
    create: async (req, res) => {
        const payload = institutes_schemas_1.createInstituteSchema.parse(req.body);
        const institute = await institutes_service_1.institutesService.create(payload);
        res.status(201).json({
            success: true,
            data: institute
        });
    },
    list: async (_req, res) => {
        const institutes = await institutes_service_1.institutesService.list();
        res.status(200).json({
            success: true,
            data: institutes
        });
    },
    stats: async (_req, res) => {
        const stats = await institutes_service_1.institutesService.getStats();
        res.status(200).json({
            success: true,
            data: stats
        });
    }
};
