from enum import Enum


class ManagementWebhookEvent(str, Enum):
    COMMENTCREATED = "commentCreated"
    COMMENTDELETED = "commentDeleted"
    COMMENTEDITED = "commentEdited"
    COMMENTMETADATAUPDATED = "commentMetadataUpdated"
    COMMENTREACTIONADDED = "commentReactionAdded"
    COMMENTREACTIONREMOVED = "commentReactionRemoved"
    NOTIFICATION = "notification"
    ROOMCREATED = "roomCreated"
    ROOMDELETED = "roomDeleted"
    STORAGEUPDATED = "storageUpdated"
    THREADCREATED = "threadCreated"
    THREADDELETED = "threadDeleted"
    THREADMARKEDASRESOLVED = "threadMarkedAsResolved"
    THREADMARKEDASUNRESOLVED = "threadMarkedAsUnresolved"
    THREADMETADATAUPDATED = "threadMetadataUpdated"
    USERENTERED = "userEntered"
    USERLEFT = "userLeft"
    YDOCUPDATED = "ydocUpdated"

    def __str__(self) -> str:
        return str(self.value)
