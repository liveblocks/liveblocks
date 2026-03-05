from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.management_project_region import ManagementProjectRegion
from ..models.management_project_type import ManagementProjectType

if TYPE_CHECKING:
    from ..models.management_project_public_key import ManagementProjectPublicKey
    from ..models.management_project_secret_key import ManagementProjectSecretKey


T = TypeVar("T", bound="ManagementProject")


@_attrs_define
class ManagementProject:
    """
    Attributes:
        id (str):
        team_id (str):
        type_ (ManagementProjectType):
        name (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        public_key (ManagementProjectPublicKey):
        secret_key (ManagementProjectSecretKey):
        region (ManagementProjectRegion):
        version_creation_timeout (bool | float): False to disable timeout or number of seconds between 30 and 300.
    """

    id: str
    team_id: str
    type_: ManagementProjectType
    name: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    public_key: ManagementProjectPublicKey
    secret_key: ManagementProjectSecretKey
    region: ManagementProjectRegion
    version_creation_timeout: bool | float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        team_id = self.team_id

        type_ = self.type_.value

        name = self.name

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        public_key = self.public_key.to_dict()

        secret_key = self.secret_key.to_dict()

        region = self.region.value

        version_creation_timeout: bool | float
        version_creation_timeout = self.version_creation_timeout

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "teamId": team_id,
                "type": type_,
                "name": name,
                "createdAt": created_at,
                "updatedAt": updated_at,
                "publicKey": public_key,
                "secretKey": secret_key,
                "region": region,
                "versionCreationTimeout": version_creation_timeout,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.management_project_public_key import ManagementProjectPublicKey
        from ..models.management_project_secret_key import ManagementProjectSecretKey

        d = dict(src_dict)
        id = d.pop("id")

        team_id = d.pop("teamId")

        type_ = ManagementProjectType(d.pop("type"))

        name = d.pop("name")

        created_at = isoparse(d.pop("createdAt"))

        updated_at = isoparse(d.pop("updatedAt"))

        public_key = ManagementProjectPublicKey.from_dict(d.pop("publicKey"))

        secret_key = ManagementProjectSecretKey.from_dict(d.pop("secretKey"))

        region = ManagementProjectRegion(d.pop("region"))

        def _parse_version_creation_timeout(data: object) -> bool | float:
            return cast(bool | float, data)

        version_creation_timeout = _parse_version_creation_timeout(d.pop("versionCreationTimeout"))

        management_project = cls(
            id=id,
            team_id=team_id,
            type_=type_,
            name=name,
            created_at=created_at,
            updated_at=updated_at,
            public_key=public_key,
            secret_key=secret_key,
            region=region,
            version_creation_timeout=version_creation_timeout,
        )

        management_project.additional_properties = d
        return management_project

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
