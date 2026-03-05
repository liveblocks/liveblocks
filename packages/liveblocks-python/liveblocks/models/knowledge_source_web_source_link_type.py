from enum import Enum


class KnowledgeSourceWebSourceLinkType(str, Enum):
    CRAWL = "crawl"
    INDIVIDUAL_LINK = "individual_link"
    SITEMAP = "sitemap"

    def __str__(self) -> str:
        return str(self.value)
