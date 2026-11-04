from rest_framework import serializers


class AnalyticsSummaryQuerySerializer(serializers.Serializer):
    """Optional inclusive date range for the summary endpoint."""

    start = serializers.DateField(required=False)
    end = serializers.DateField(required=False)

    def validate(self, attrs):
        start = attrs.get("start")
        end = attrs.get("end")
        if start and end and end < start:
            raise serializers.ValidationError({"end": "end must be on or after start."})
        return attrs
