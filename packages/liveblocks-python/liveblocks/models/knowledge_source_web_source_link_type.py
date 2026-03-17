from enum import StrEnum


class KnowledgeSourceWebSourceLinkType(StrEnum):
    CRAWL = "crawl"
    INDIVIDUAL_LINK = "individual_link"
    SITEMAP = "sitemap"
