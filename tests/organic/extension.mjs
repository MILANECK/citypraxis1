import {HarnessStop} from './support.mjs';

// A new owner-authorized allowance is incremental. Old usage stays on the ledger.
export function additionalAllowance(config,ledger,resumed,{usd,minutes}={}){
  if(usd!==undefined||minutes!==undefined){
    if(!resumed?.metadata?.finishedAt)throw new HarnessStop('extension_requires_completed_prior_run');
    if(!(Number.isFinite(usd)&&usd>0&&usd<=5&&Number.isFinite(minutes)&&minutes>0&&minutes<=40))throw new HarnessStop('extension_exceeds_owner_allowance');
    if(ledger.unknownUsage)throw new HarnessStop('extension_requires_complete_usage');
    const allowance={authorizedAt:new Date().toISOString(),authorization:'Owner requested an additional $5 and 30–40 minutes for remaining bilingual tests.',priorRunId:resumed.runId,usd,minutes,startRequests:ledger.requests,startReportedTokens:ledger.usedTokens,startEstimateUsd:ledger.estimatedUsd,startGuardUsd:ledger.guardUsd,startExecutionSeconds:(ledger.priorElapsedMs||0)/1000};
    allowance.cumulativeUsdLimit=allowance.startGuardUsd+usd;
    allowance.cumulativeMinutesLimit=allowance.startExecutionSeconds/60+minutes;
    Object.assign(config,{budgetUsd:allowance.cumulativeUsdLimit,maxMinutes:allowance.cumulativeMinutesLimit,maxRequests:ledger.requests+2000,maxTotalTokens:ledger.usedTokens+12000000});
    allowance.cumulativeRequestLimit=config.maxRequests;allowance.cumulativeTokenLimit=config.maxTotalTokens;
    return allowance;
  }
  const allowance=resumed?.metadata?.activeAdditionalAllowance;
  if(allowance){
    if(ledger.guardUsd>allowance.cumulativeUsdLimit+1e-9)throw new HarnessStop('prior_extension_already_over_cap');
    Object.assign(config,{budgetUsd:allowance.cumulativeUsdLimit,maxMinutes:allowance.cumulativeMinutesLimit,maxRequests:allowance.cumulativeRequestLimit,maxTotalTokens:allowance.cumulativeTokenLimit});
    return allowance;
  }
  return null;
}
