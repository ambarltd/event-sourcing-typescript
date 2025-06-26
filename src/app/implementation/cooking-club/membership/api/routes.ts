
import { AmbarAuthMiddleware } from "../../../../common";
import { app } from "../../../../main";

app.use('/api/v1/cooking-club/membership/reaction', AmbarAuthMiddleware, (req, res, next) => {
    // const controller = req.container.resolve(EvaluateApplicationReactionController);
    // return controller.router(req, res, next);
});

export const CoockingClubMembershipRoutes = app;

