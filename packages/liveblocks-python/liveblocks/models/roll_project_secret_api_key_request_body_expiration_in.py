from enum import StrEnum


class RollProjectSecretApiKeyRequestBodyExpirationIn(StrEnum):
    NOW = "now"
    VALUE_1 = "1h"
    VALUE_10 = "7d"
    VALUE_11 = "7days"
    VALUE_12 = "7 days"
    VALUE_2 = "1hour"
    VALUE_3 = "1 hour"
    VALUE_4 = "24hrs"
    VALUE_5 = "24hours"
    VALUE_6 = "24 hours"
    VALUE_7 = "3d"
    VALUE_8 = "3days"
    VALUE_9 = "3 days"
