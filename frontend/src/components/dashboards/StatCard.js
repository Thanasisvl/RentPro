import React from "react";
import { Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";

function StatCard({ title, value, subtitle, loading = false, actions = null }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>

        {loading ? (
          <Skeleton width="55%" height={44} />
        ) : (
          <Typography variant="h4" sx={{ lineHeight: 1.1 }}>
            {value}
          </Typography>
        )}

        {subtitle ? (
          loading ? (
            <Skeleton width="85%" />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )
        ) : null}

        {actions ? (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            {actions}
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default StatCard;

