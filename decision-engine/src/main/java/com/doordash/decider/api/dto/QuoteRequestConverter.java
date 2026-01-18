package com.doordash.decider.api.dto;

import com.doordash.decider.domain.DriverProfile;
import com.doordash.decider.domain.Offer;

public final class QuoteRequestConverter {

    private QuoteRequestConverter() {
    }

    public static Offer toOffer(QuoteRequest request) {
        return new Offer(
                request.offerId(),
                request.payout(),
                request.distanceMiles(),
                request.estimatedMinutes(),
                request.earnedSoFar(),
                request.shiftStartHHMM(),
                request.finishHHMM(),
                request.bufferMinutes(),
                request.costPerMile()
        );
    }

    public static DriverProfile toDriverProfile(QuoteRequest request) {
        return new DriverProfile(
                request.driverId(),
                request.targetHourlyRate(),
                request.availableMinutes()
        );
    }
}
