from enum import StrEnum


class ManagementWebhookEvent(StrEnum):
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
